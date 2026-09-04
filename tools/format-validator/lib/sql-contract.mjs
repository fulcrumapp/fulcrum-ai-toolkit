// The read-only SQL contract, decided on a parsed PostgreSQL syntax tree.
//
// Fulcrum's Query API is read-only, so every SQL statement this repository
// distributes — in a `.sql` asset or in a report template's QUERY() call — must
// be read-only too. `pgsql-ast-parser`, pinned in package-lock.json, parses it;
// nothing is executed and no database is reached.
//
// Every allowlist below holds exactly what the repository's own examples
// produce, and nothing else, so an unlisted form is rejected whether or not it
// happens to write. That is the point: `_geometry::geography` is a cast this
// package uses, while `x::application_side_effect_type` names a type whose
// input function is outside this contract's knowledge, so it fails closed.
//
//   1. Every top-level statement is a SELECT.
//   2. A QUERY() argument holds exactly one statement, so a second one cannot
//      ride along behind a semicolon.
//   3. Nothing anywhere in the tree writes INTO a table.
//   4. Every node `type`, every operator, every cast target, and every called
//      function anywhere in the tree is on its allowlist.
//
// SQL the parser cannot parse is a violation, because a statement that cannot
// be parsed cannot be proven read-only. Comments, string literals, and quoted
// identifiers are inert, because the parser resolves them before this contract
// sees them: `SELECT 'DELETE FROM x'` is a string, while `"nextval"(1)` and
// `pg_catalog."setval"(1, 2)` both arrive as ordinary calls with the quoting
// removed, so neither can hide behind quotes.
//
// Every violation carries a `kind`, so the probes in self-check.mjs can pin the
// rule that caught it rather than only the fact that something did.

import { parse as parsePostgres } from 'pgsql-ast-parser';

// A caller-supplied literal — `:name` in a SQL asset, `${...}` in a report
// template — is replaced with NULL so the surrounding statement can be parsed
// for its shape. Encoding that literal is a separate contract, enforced on the
// template side by ejs-queries.mjs.
const BIND_PLACEHOLDER = /(?<![:\w]):[A-Za-z_][A-Za-z0-9_]*/g;

export const INTERPOLATION_PLACEHOLDER = 'NULL';

// The only statement form the read-only examples use.
const READ_ONLY_STATEMENTS = new Set(['select']);

// Every `type` the read-only examples produce, including the join kind that
// appears on a `from` entry's `join` object. Anything else — `delete`,
// `insert`, `update`, `with`, `union`, `ternary`, or a form a future parser
// adds — is not on the list and is rejected.
const READ_ONLY_AST_TYPES = new Set([
  'INNER JOIN',
  'binary',
  'call',
  'cast',
  'integer',
  'null',
  'ref',
  'select',
  'string',
  'table'
]);

// Every operator the examples use. Absent, and so rejected: `@@` and the rest
// of full-text search, the JSON operators, `||`, and every custom operator,
// each of which can invoke a function this contract has never seen.
const READ_ONLY_OPERATORS = new Set(['<', '=', '>=', 'AND']);

// The one cast the examples take: metre-based PostGIS distance. A cast runs the
// target type's input function, so an unlisted type is rejected by name.
const READ_ONLY_CAST_TYPES = new Set(['geography']);

// The read-only functions the examples actually call. The parser lowercases and
// unquotes every function name, so one spelling covers every way of writing it.
// A function that is absent — `lo_create`, `pg_advisory_unlock`, `setval`,
// `pg_notify`, or anything unrecognized — fails closed.
const READ_ONLY_FUNCTIONS = new Set(['st_dwithin', 'st_makepoint', 'st_setsrid']);

// BETWEEN is inclusive of its upper bound, so against a timestamp column it
// keeps only midnight on the end day and drops every later reading that day.
// The examples use a half-open `>= start AND < day-after-end` range instead.
const INCLUSIVE_RANGE_OPERATORS = new Set(['BETWEEN', 'NOT BETWEEN']);

// Every object in the tree, so no rule can be evaded by nesting one form inside
// another. `_location` is parser bookkeeping rather than syntax.
function treeNodes(value, found = []) {
  if (Array.isArray(value)) {
    for (const item of value) treeNodes(item, found);
    return found;
  }
  if (!value || typeof value !== 'object') return found;

  found.push(value);
  for (const [key, child] of Object.entries(value)) {
    if (key === '_location') continue;
    treeNodes(child, found);
  }
  return found;
}

// The name a call or cast target spells, or null when it is schema-qualified or
// unnamed. A schema qualifier is never resolved here, so it never matches.
function plainName(named) {
  if (!named || named.schema) return null;
  return typeof named.name === 'string' ? named.name.toLowerCase() : null;
}

function violation(kind, reason) {
  return { kind, reason };
}

function nodeViolations(node, where) {
  const found = [];

  if (node.into) found.push(violation('into', `${where} writes INTO a table`));

  if (typeof node.op === 'string') {
    if (node.opSchema) {
      found.push(
        violation(
          'operator-schema',
          `${where} uses schema-qualified operator ${node.opSchema}.${node.op}, which is not allowed`
        )
      );
    }
    if (INCLUSIVE_RANGE_OPERATORS.has(node.op)) {
      return [
        violation(
          'inclusive-range',
          `${where} uses ${node.op}, whose upper bound is inclusive; use a half-open >= and < range`
        )
      ];
    }
    if (!READ_ONLY_OPERATORS.has(node.op)) {
      found.push(
        violation('operator', `${where} uses the ${node.op} operator, which is not on the read-only allowlist`)
      );
    }
  }

  if (typeof node.type === 'string' && !READ_ONLY_AST_TYPES.has(node.type)) {
    found.push(
      violation('node-form', `${where} uses the ${node.type} form, which is not on the read-only allowlist`)
    );
  }

  if (node.type === 'cast' && !READ_ONLY_CAST_TYPES.has(plainName(node.to))) {
    const target = node.to?.schema ? `${node.to.schema}.${node.to.name}` : (node.to?.name ?? 'an unnamed type');
    found.push(
      violation('cast', `${where} casts to ${target}, which is not on the read-only cast allowlist`)
    );
  }

  if (node.type === 'call' && !READ_ONLY_FUNCTIONS.has(plainName(node.function))) {
    const name = node.function?.schema
      ? `${node.function.schema}.${node.function.name}`
      : (node.function?.name ?? 'an unnamed function');
    found.push(
      violation('function', `${where} calls ${name}, which is not on the read-only function allowlist`)
    );
  }

  return found;
}

// Returns [] when every statement in `sql` is proven read-only, and one
// { kind, reason } per violation otherwise.
//
// `single` is set for a report template's QUERY() argument, which the Query API
// runs as one statement; a `.sql` asset is a catalogue and holds several.
export function readOnlyViolations(sql, { single = false } = {}) {
  const normalized = String(sql ?? '').replace(BIND_PLACEHOLDER, INTERPOLATION_PLACEHOLDER);

  let statements;
  try {
    statements = parsePostgres(normalized);
  } catch (error) {
    const detail = String(error.message).split('\n')[0];
    return [
      violation('unreadable', `is not parseable PostgreSQL, so it cannot be proven read-only: ${detail}`)
    ];
  }

  // The pinned parser throws rather than returning nothing, so this is the same
  // failure reached by a different route: no statement, nothing proven.
  if (statements.length === 0) {
    return [violation('unreadable', 'contains no SQL statement, so nothing was proven read-only')];
  }

  const violations = [];
  if (single && statements.length > 1) {
    violations.push(
      violation('statement-count', `holds ${statements.length} statements where the Query API takes one`)
    );
  }

  statements.forEach((statement, offset) => {
    const where = `statement ${offset + 1}`;

    if (!READ_ONLY_STATEMENTS.has(statement.type)) {
      violations.push(
        violation('statement-form', `${where} is a ${statement.type} statement, and only SELECT is read-only`)
      );
    }

    for (const node of treeNodes(statement)) violations.push(...nodeViolations(node, where));
  });

  const seen = new Set();
  return violations.filter(({ reason }) => {
    if (seen.has(reason)) return false;
    seen.add(reason);
    return true;
  });
}
