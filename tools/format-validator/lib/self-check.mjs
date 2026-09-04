// Probes that prove the SQL, QUERY(), encoder, and intrinsic contracts still
// catch what they are for. They run on every validation, so the contracts are
// exercised by the same command that validates the repository rather than by a
// separate suite.
//
// Each probe is a bypass someone could plausibly write, and each names the rule
// that must catch it. Naming the rule is what makes a probe useful: one that
// only asserts "rejected" keeps passing when a rule dies and another happens to
// cover for it, which is how a contract quietly stops working.
//
// The scope here is exactly the SQL a QUERY() call may carry. There is no probe
// for what a template's HTML renders to, because nothing in this tool claims to
// know that.
//
// Nothing here is executed. A probe template is turned into source and parsed,
// exactly as a repository file is.

import { compiledSource, queryCalls, recognizedEncoders } from './ejs-queries.mjs';
import { validateDocument, validateInventory } from './schema-contract.mjs';
import { readOnlyViolations } from './sql-contract.mjs';

const QUERY_ONE = { single: true };

// [sql, kinds, because, options?] — every kind listed must appear among the
// violations reported, so a probe cannot pass because some other rule covered
// for the one it names.
const REJECTED_SQL = [
  // Writes, however they are spelled. The parser refuses `SELECT ... INTO`
  // outright, and SQL that cannot be parsed cannot be proven read-only; the
  // `into` rule covers the form itself on a statement the parser does accept.
  ['SELECT a INTO written FROM "App"', ['unreadable'], 'SELECT ... INTO writing a new table'],
  ['SELECT * INTO TEMP written FROM "App"', ['unreadable'], 'SELECT ... INTO TEMP writing a temp table'],
  ['INSERT INTO "App" (a) VALUES (1)', ['into', 'statement-form'], 'writing INTO a table'],
  ['DELETE FROM "App"', ['statement-form', 'node-form'], 'a bare DELETE'],
  ["UPDATE \"App\" SET _status = 'x'", ['statement-form', 'node-form'], 'a bare UPDATE'],
  ['/* housekeeping */ DROP TABLE "App"', ['statement-form', 'node-form'], 'a comment-prefixed DROP'],
  ['SELECT 1; DELETE FROM "App"', ['statement-form', 'node-form'], 'a second statement after a semicolon'],
  ['SELECT a FROM t UNION SELECT b FROM u', ['statement-form'], 'an unlisted statement form'],
  [
    'WITH removed AS (DELETE FROM "App" RETURNING *) SELECT * FROM removed',
    ['statement-form', 'node-form'],
    'a writing CTE'
  ],
  ['SELECT 1; SELECT 2', ['statement-count'], 'a second statement in one QUERY() argument', QUERY_ONE],

  // Functions, including every way of disguising the name.
  ['SELECT lo_create(0)', ['function'], 'lo_create creating a large object'],
  ['SELECT pg_advisory_lock(1)', ['function'], 'pg_advisory_lock taking a lock'],
  ['SELECT pg_advisory_unlock(1)', ['function'], 'pg_advisory_unlock releasing a lock'],
  ["SELECT lo_import('/etc/passwd')", ['function'], 'lo_import reading a server file'],
  ["SELECT setval('s', 1)", ['function'], 'setval moving a sequence'],
  ["SELECT nextval('s')", ['function'], 'nextval consuming a sequence'],
  ["SELECT pg_notify('c', 'm')", ['function'], 'pg_notify raising a notification'],
  ['SELECT "nextval"(\'s\')', ['function'], 'a quoted nextval'],
  ['SELECT pg_catalog."setval"(\'s\', 1)', ['function'], 'a schema-qualified quoted setval'],
  ['SELECT evil.st_dwithin(a, b, 1)', ['function'], 'a schema-qualified allowlisted function name'],
  ['SELECT unknown_function(1)', ['function'], 'an unrecognized function'],
  ['SELECT (SELECT lo_create(0))', ['function'], 'a writing call nested in a subquery'],
  ["SELECT 1 WHERE EXISTS (SELECT pg_notify('a', 'b'))", ['function'], 'a writing call inside EXISTS'],

  // Casts run the target type's input function, so only the type the examples
  // take is allowed and every other one is named and refused.
  ['SELECT a::application_side_effect_type FROM "App"', ['cast'], 'a cast to a custom type'],
  ['SELECT a::text FROM "App"', ['cast'], 'a cast to a type the examples never take'],
  ['SELECT a::pg_catalog.geography FROM "App"', ['cast'], 'a schema-qualified cast to an allowed type'],

  // Operators reach functions too, and an unlisted one is refused by name.
  ["SELECT * FROM \"App\" WHERE tsv @@ to_tsquery('x')", ['operator'], 'the @@ full-text search operator'],
  ["SELECT * FROM \"App\" WHERE a || b = 'x'", ['operator'], 'the || concatenation operator'],
  [
    'SELECT * FROM app_table WHERE a OPERATOR(evil.=) b',
    ['operator-schema'],
    'a schema-qualified custom operator'
  ],
  ["SELECT * FROM \"App\" WHERE meta -> 'k' = 'v'", ['operator'], 'a JSON traversal operator'],
  [
    "SELECT * FROM \"Inspections\" WHERE _created_at BETWEEN '2024-01-01' AND '2024-03-31'",
    ['inclusive-range'],
    'an inclusive BETWEEN bound on a timestamp column'
  ],

  ['', ['unreadable'], 'empty SQL']
];

// The shapes the read-only examples actually use, which must keep passing so
// the contract cannot reach safety by refusing everything.
const ACCEPTED_SQL = [
  'SELECT * FROM "My App Name" LIMIT 10',
  'SELECT _record_id, _status FROM "My App" ORDER BY _updated_at DESC LIMIT 100',
  "SELECT 'DELETE FROM x' AS note",
  "SELECT 'It''s safe'",
  'SELECT "a""b" FROM "Table"',
  'SELECT p._record_id, r.some_field FROM "My App" p JOIN "My App/my_repeatable" r ON r._parent_id = p._record_id',
  'SELECT _record_id FROM "My App" WHERE ST_DWithin(_geometry::geography, ' +
    'ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography, 1000)',
  'SELECT * FROM "Inspections" WHERE _created_at >= :start AND _created_at < :end LIMIT 500'
];

const WRITE = 'DELETE FROM "App"';
// The same write with no quoting of its own, for probes that have to put the
// statement inside a nested JavaScript string.
const NESTED_WRITE = 'DELETE FROM app_table';
// The recognized identifier encoder, written where the value enters SQL.
const TOKEN = "('' + $params.q).replace(/[^A-Za-z0-9_-]/g, '')";

// A scriptlet, a call written as one, and a QUERY() whose SQL selects on a gap.
const js = (code) => `<% ${code} %>`;
const writes = (call) => js(`const removed = ${call};`);
const gap = (expression) =>
  js(`const rows = QUERY(\`SELECT * FROM "App" WHERE q = '${expression}'\`, { format: 'json' });`);

// [because, template, findings, outcome, reason]
//
//   findings  how many things the walker must find, so a probe cannot pass by
//             finding something else
//   outcome   'read' when the SQL was recovered out of the tree, 'unreadable'
//             when something was refused instead, 'ignored' when there was
//             nothing to find
//   reason    a fragment of the rule that must reject it, or null when the
//             probe must be accepted with no violation at all
const TEMPLATE_PROBES = [
  // The call itself, however it is spelled.
  ['a double-quoted string argument', writes(`QUERY("${WRITE.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}")`), 1, 'read', 'only SELECT'],
  ['a single-quoted string argument', writes(`QUERY('${WRITE}')`), 1, 'read', 'only SELECT'],
  ['a comment between the name and its parenthesis', writes(`QUERY /* c */ (\`${WRITE}\`)`), 1, 'read', 'only SELECT'],
  ['a newline between the name and its parenthesis', writes(`QUERY\n  (\`${WRITE}\`)`), 1, 'read', 'only SELECT'],
  ['a tagged template', writes(`QUERY\`${WRITE}\``), 1, 'read', 'only SELECT'],
  ['a second statement hidden in one call', writes(`QUERY('SELECT 1; ${NESTED_WRITE}')`), 1, 'read', 'statements where the Query API takes one'],
  ['a statement assembled in a variable', js(`const q = '${WRITE}'; const removed = QUERY(q);`), 1, 'unreadable', 'rather than a string or template literal'],
  ['a statement concatenated inline', writes(`QUERY('DELETE ' + 'FROM "App"')`), 1, 'unreadable', 'rather than a string or template literal'],
  ['the helper aliased to another name', js(`const run = QUERY; const removed = run(\`${WRITE}\`);`), 1, 'unreadable', 'referenced somewhere other than a direct call'],
  ['a call with no argument at all', writes('QUERY()'), 1, 'unreadable', 'has no SQL argument'],

  // The helper reached through the locals bag `ejs` opens with `with`, which
  // runs the same function a bare call would.
  ['the helper as a property of the locals bag', writes(`locals.QUERY('${WRITE}')`), 1, 'read', 'only SELECT'],
  ['the helper with a string subscript', writes(`locals['QUERY']('${WRITE}')`), 1, 'read', 'only SELECT'],
  ['the helper named by a variable subscript', js(`const n = 'QUERY'; const removed = locals[n]('${WRITE}');`), 1, 'unreadable', 'looked up with an expression rather than a literal'],
  ['the helper destructured out of the locals bag', js(`const { QUERY: run } = locals; const removed = run('${WRITE}');`), 1, 'unreadable', 'used as a value rather than read through a named property'],
  ['the locals bag copied to another name', js(`const bag = locals; const removed = bag.QUERY('${WRITE}');`), 2, 'unreadable', 'used as a value rather than read through a named property'],
  ['a member reference that is not itself the call', js(`const run = locals.QUERY; const removed = run('${WRITE}');`), 1, 'unreadable', 'referenced somewhere other than a direct call'],
  ['QUERY extracted through the arguments object', `<% const { "QUERY": run } = arguments[0]; run("${NESTED_WRITE}"); %>`, 1, 'unreadable', 'exposes the locals bag indirectly'],

  // Names that reach code, the global scope, or an object's internals.
  ['a statement built as text and run through eval', writes(`eval("QUERY('${NESTED_WRITE}')")`), 1, 'unreadable', 'turns text into code'],
  ['a statement run through the Function constructor', `<% const r = new Function('Q', "return Q('${NESTED_WRITE}')"); r(QUERY); %>`, 2, 'unreadable', 'turns text into code'],
  ['Function reached through a static member', `<% globalThis["Function"]("QUERY(\\"${NESTED_WRITE}\\")")(); %>`, 2, 'unreadable', 'reaches the global object'],
  ['indirect construction through a constructor', `<% String.constructor("l", "l.QUERY(\\"${NESTED_WRITE}\\")")(arguments[0]); %>`, 2, 'unreadable', 'reaches a constructor'],
  ['a property reached through Reflect', `<% const r = Reflect.get(locals, "QUERY"); r("${NESTED_WRITE}"); %>`, 2, 'unreadable', 'can read or write a property this contract cannot name'],
  [
    'prototype mutation through Object reflection',
    `<% Object.defineProperty(Object.getPrototypeOf(''), 'replace', { value: (v) => v }); %>${gap(TOKEN)}`,
    3,
    'unreadable',
    'exposes reflection methods'
  ],

  // The intrinsics the encoders are written against. No example names them, and
  // no spelling below may rebind or rewrite one.
  ['String rebound by a const declaration', `<% const String = (v) => v; %>${gap(TOKEN)}`, 2, 'unreadable', 'String is rebound'],
  ['String rebound through a function parameter', `<% ((String) => { %>${gap(TOKEN)}<% })(null); %>`, 2, 'unreadable', 'String is rebound'],
  ['String rebound through a catch clause', `<% try { %>${gap(TOKEN)}<% } catch (String) { } %>`, 2, 'unreadable', 'String is rebound'],
  ['String rebound through a destructured default', `<% function b({ as: String = null }) { %>${gap(TOKEN)}<% } %>`, 2, 'unreadable', 'String is rebound'],
  ['RegExp rebound through a catch clause', `<% try { %>${gap(TOKEN)}<% } catch (RegExp) { } %>`, 2, 'unreadable', 'RegExp is rebound'],
  ['String reassigned outright', `<% String = function (v) { return v; }; %>${gap(TOKEN)}`, 2, 'unreadable', 'String is assigned to'],
  ['a String property overwritten', `<% String.raw = function () { return ''; }; %>${gap(TOKEN)}`, 2, 'unreadable', 'String is assigned to'],
  ['the prototype method the encoders use overwritten', `<% String.prototype.replace = function () { return "' OR 1=1 --"; }; %>${gap(TOKEN)}`, 2, 'unreadable', 'reaches a prototype'],
  ['the String prototype reached through __proto__', `<% ''.__proto__.replace = function () { return ''; }; %>${gap(TOKEN)}`, 2, 'unreadable', 'reaches a prototype'],

  // Interpolation. Reading a statement means replacing each gap with a
  // placeholder, and a placeholder is only earned by a recognized encoder
  // written inside the quotes it lands in.
  ['a parameter interpolated with nothing done to it', gap('${$params.q}'), 1, 'unreadable', 'not one of the recognized SQL encoders'],
  ['a value sanitized somewhere other than the gap', `<% const safe = ${TOKEN}; %>${gap('${safe}')}`, 1, 'unreadable', 'not one of the recognized SQL encoders'],
  ['a fixed string interpolated into a quoted literal', gap("${'complete'}"), 1, 'unreadable', 'not one of the recognized SQL encoders'],
  ['the ambient String sanitizer this contract used to trust', gap("${String($params.q).replace(/[^A-Za-z0-9_-]/g, '')}"), 1, 'unreadable', 'not known to be a string built without a binding this template could rebind'],
  ['a character class wider than any recognized encoder', gap("${('' + $params.q).replace(/[^A-Za-z0-9_'-]/g, '')}"), 1, 'unreadable', 'is not a recognized encoder'],
  ['a recognized class that removes only the first match', gap("${('' + $params.q).replace(/[^A-Za-z0-9_-]/, '')}"), 1, 'unreadable', 'only the g flag removes every occurrence'],
  ['an encoder that keeps what it matches', gap("${('' + $params.q).replace(/[^A-Za-z0-9_-]/g, '_')}"), 1, 'unreadable', 'so the removed characters are not gone'],
  [
    'an encoded value interpolated outside any quoted literal',
    '<% const rows = QUERY(`SELECT * FROM "App" ' +
      "LIMIT ${('' + $params.n).replace(/[^0-9-]/g, '')}`, { format: 'json' }); %>",
    1,
    'unreadable',
    'interpolated outside a quoted SQL string literal'
  ],

  // What must still be accepted.
  ['the recognized identifier encoder in its own gap', gap(`\${${TOKEN}}`), 1, 'read', null],
  [
    'the recognized date encoder in its own gap',
    '<% const rows = QUERY(`SELECT * FROM "Inspections" ' +
      "WHERE _created_at >= '${('' + $params.start).replace(/[^0-9-]/g, '')}'`, { format: 'json' }); %>",
    1,
    'read',
    null
  ],
  ['a read-only statement in a plain string', writes('QUERY(\'SELECT * FROM "App" LIMIT 1\')'), 1, 'read', null],
  [
    'two calls in one template',
    '<% const a = QUERY(`SELECT * FROM "App" LIMIT 1`); %>\n<% const b = QUERY(`SELECT * FROM "Other" LIMIT 1`); %>',
    2,
    'read',
    null
  ],
  // A literal subscript names one thing and cannot become another, and a
  // lowercase name is a different function that reaches no database. Reporting
  // either would be a false alarm that pushes examples into worse shapes.
  ['a collection indexed by a literal', "<% const f = record.formValues.find('p').items[0]; %>", 0, 'ignored', null],
  ['a lowercase name that is not the runtime helper', writes(`query('${WRITE}')`), 0, 'ignored', null]
];

function sqlFailures() {
  const failures = [];

  for (const [sql, kinds, because, options = {}] of REJECTED_SQL) {
    const reported = new Set(readOnlyViolations(sql, options).map(({ kind }) => kind));
    const missing = kinds.filter((kind) => !reported.has(kind));
    if (missing.length === 0) continue;

    failures.push(
      `the read-only SQL contract no longer rejects ${because} by ${missing.join(' and ')}: ${JSON.stringify(sql)}`
    );
  }

  for (const sql of ACCEPTED_SQL) {
    const violations = readOnlyViolations(sql);
    if (violations.length === 0) continue;

    failures.push(
      'the read-only SQL contract rejects a read-only shape the examples use: ' +
        `${JSON.stringify(sql)} (${violations.map(({ reason }) => reason).join('; ')})`
    );
  }

  return failures;
}

function outcomeOf(findings) {
  if (findings.length === 0) return 'ignored';
  return findings.some((finding) => finding.reason) ? 'unreadable' : 'read';
}

function templateFailures() {
  const failures = [];

  for (const [because, template, expectedFindings, expectedOutcome, reason] of TEMPLATE_PROBES) {
    let findings;
    try {
      findings = queryCalls(compiledSource(template, 'self-check.ejs'));
    } catch (error) {
      failures.push(`QUERY() discovery threw on ${because}: ${String(error.message).split('\n')[0]}`);
      continue;
    }

    if (findings.length !== expectedFindings) {
      failures.push(
        `QUERY() discovery made ${findings.length} findings instead of ${expectedFindings} for ${because}`
      );
      continue;
    }

    const outcome = outcomeOf(findings);
    if (outcome !== expectedOutcome) {
      failures.push(`QUERY() discovery treats ${because} as ${outcome} rather than ${expectedOutcome}`);
      continue;
    }

    const violations = findings.flatMap((finding) =>
      finding.reason ? [finding.reason] : readOnlyViolations(finding.sql, QUERY_ONE).map((v) => v.reason)
    );

    if (reason === null) {
      if (violations.length > 0) failures.push(`QUERY() validation rejects ${because}: ${violations.join('; ')}`);
    } else if (!violations.some((violation) => violation.includes(reason))) {
      failures.push(
        `QUERY() validation no longer rejects ${because} by the rule that says ` +
          `"${reason}": ${violations.join('; ') || 'nothing was reported'}`
      );
    }
  }

  return failures;
}

// What an encoded value may still contain. A quote cannot end the SQL literal,
// a backslash cannot escape, a semicolon cannot start a statement, and a
// solidus or asterisk cannot open a comment, because none of them are here.
const SAFE_CHARACTER = /^[A-Za-z0-9_-]$/;

// The recognized encoders are two constants, so what each keeps is measured
// rather than described. Scanning the first 256 code points is enough: each
// class body is plain ASCII, so a negated class removes every character above
// it without having to enumerate them.
function encoderFailures() {
  const failures = [];

  for (const [pattern, type] of recognizedEncoders) {
    const matcher = new RegExp(pattern);
    const kept = [];
    for (let code = 0; code < 256; code += 1) {
      const character = String.fromCharCode(code);
      if (!matcher.test(character) && !SAFE_CHARACTER.test(character)) kept.push(JSON.stringify(character));
    }
    if (kept.length === 0) continue;

    failures.push(
      `the recognized encoder for ${type}, /${pattern}/, keeps ${kept.join(', ')}, which can leave the ` +
        'quoted literal it is interpolated into'
    );
  }

  return failures;
}

const SCHEMA_PROBES = [
  [
    'valid FormRecordLinkFieldElement',
    {
      type: 'RecordLinkField',
      key: 'a1b2',
      label: 'Linked Site',
      data_name: 'linked_site',
      linked_form_id: '00000000-0000-4000-8000-000000000000',
      allow_existing_records: true
    },
    'FormRecordLinkFieldElement',
    null
  ],
  [
    'undocumented property',
    {
      type: 'RecordLinkField',
      key: 'a1b2',
      label: 'Linked Record',
      data_name: 'linked_record',
      linked_form_id: 'the-form-id',
      unknown_setting: true
    },
    'FormRecordLinkFieldElement',
    'undocumented property "unknown_setting"'
  ],
  [
    'invalid value type',
    {
      type: 'RecordLinkField',
      key: 'a1b2',
      label: 'Linked Record',
      data_name: 'linked_record',
      linked_form_id: 'the-form-id',
      allow_existing_records: 'yes'
    },
    'FormRecordLinkFieldElement',
    'expected boolean'
  ]
];

function schemaFailures(schemas) {
  const failures = [];
  for (const [name, doc, schemaName, expectedError] of SCHEMA_PROBES) {
    const errors = validateDocument(doc, schemaName, schemas);
    if (expectedError === null) {
      if (errors.length > 0) {
        failures.push(`OpenAPI schema contract rejected ${name}: ${errors.join('; ')}`);
      }
    } else if (!errors.some((err) => err.includes(expectedError))) {
      failures.push(
        `OpenAPI schema contract did not reject ${name} with "${expectedError}": ${errors.join('; ') || 'no errors'}`
      );
    }
  }

  // Inventory probe
  const unlistedPath = 'plugins/fulcrum-ai-toolkit/skills/future-skill/examples/unlisted.json';
  const inventoryErrors = validateInventory([unlistedPath]);
  if (!inventoryErrors.some((err) => err.includes('must map to an OpenAPI component schema'))) {
    failures.push('OpenAPI inventory validation did not reject unmapped JSON example');
  }

  return failures;
}

// Returns { failures, total } — the reasons the contracts are no longer sound,
// and how many probes were exercised.
export function selfCheck(schemas) {
  return {
    failures: [...sqlFailures(), ...templateFailures(), ...encoderFailures(), ...schemaFailures(schemas)],
    total:
      REJECTED_SQL.length +
      ACCEPTED_SQL.length +
      TEMPLATE_PROBES.length +
      recognizedEncoders.size +
      SCHEMA_PROBES.length +
      1
  };
}
