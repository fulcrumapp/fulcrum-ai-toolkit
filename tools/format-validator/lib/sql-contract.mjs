// The read-only SQL contract, decided on a parsed PostgreSQL syntax tree.
//
// Fulcrum's Query API is read-only, so every SQL statement this repository
// distributes — in a `.sql` asset or in a report template's QUERY() call — must
// be read-only too. That used to be decided by a hand-written lexer. It is now
// decided by `pgsql-ast-parser`, pinned in package-lock.json, so there is one
// SQL implementation in the repository rather than two.
//
// Four rules, applied to every statement and every node beneath it. All of them
// fail closed: the allowlists hold only the forms the repository's own
// read-only examples produce, so an unlisted form is rejected whether or not it
// happens to write.
//
//   1. Every top-level statement is a form in READ_ONLY_STATEMENTS.
//   2. Nothing anywhere in the tree writes INTO a table. `INSERT INTO` is
//      caught here as well as by rule 1, and `SELECT ... INTO` would be caught
//      here if the parser ever accepted it — today the parser refuses it, which
//      is itself a violation.
//   3. Every `type` anywhere in the tree is in READ_ONLY_AST_TYPES.
//   4. Every function call anywhere in the tree is in READ_ONLY_FUNCTIONS.
//
// SQL the parser cannot parse is a violation, because a statement that cannot
// be parsed cannot be proven read-only. Comments, string literals, and quoted
// identifiers are inert, because the parser resolves them before this contract
// sees them: `SELECT 'DELETE FROM x'` is a string, while `"nextval"(1)` and
// `pg_catalog."setval"(1, 2)` both arrive as ordinary calls with the quoting
// removed, so neither can hide behind quotes.
//
// Every violation carries a `kind`, so the fixtures in self-check.mjs can pin
// the rule that caught it rather than only the fact that something did.

import { parse as parsePostgres } from 'pgsql-ast-parser';

// A caller-supplied literal — `:name` in a SQL asset, `${...}` in a report
// template — is replaced with NULL so the surrounding statement can be parsed
// for its shape. Encoding that literal is a separate contract, which the
// examples carry in prose.
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

function functionName(node) {
  const name = node.function?.name;
  if (node.function?.schema) return null;
  return typeof name === 'string' ? name.toLowerCase() : null;
}

function violation(kind, reason) {
  return { kind, reason };
}

// Returns [] when every statement in `sql` is proven read-only, and one
// { kind, reason } per violation otherwise.
export function readOnlyViolations(sql) {
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
  statements.forEach((statement, offset) => {
    const where = `statement ${offset + 1}`;

    if (!READ_ONLY_STATEMENTS.has(statement.type)) {
      violations.push(
        violation('statement-form', `${where} is a ${statement.type} statement, and only SELECT is read-only`)
      );
    }

    for (const node of treeNodes(statement)) {
      if (node.into) {
        violations.push(violation('into', `${where} writes INTO a table`));
      }
      if (INCLUSIVE_RANGE_OPERATORS.has(node.op)) {
        violations.push(
          violation(
            'inclusive-range',
            `${where} uses ${node.op}, whose upper bound is inclusive; use a half-open >= and < range`
          )
        );
      }
      if (typeof node.type === 'string' && !READ_ONLY_AST_TYPES.has(node.type)) {
        violations.push(
          violation('node-form', `${where} uses the ${node.type} form, which is not on the read-only allowlist`)
        );
      }
      if (node.type === 'call' && !READ_ONLY_FUNCTIONS.has(functionName(node))) {
        const name = node.function?.schema
          ? `${node.function.schema}.${node.function.name}`
          : (functionName(node) ?? 'an unnamed function');
        violations.push(
          violation('function', `${where} calls ${name}, which is not on the read-only function allowlist`)
        );
      }
    }
  });

  const seen = new Set();
  return violations.filter(({ reason }) => {
    if (seen.has(reason)) return false;
    seen.add(reason);
    return true;
  });
}
