// Fixtures that prove the SQL, QUERY(), interpolation, rendered-markup, and
// branch-coverage contracts still catch what they are for. They run on every
// validation, so the contracts are exercised by the same command that validates
// the repository rather than by a separate suite.
//
// Each fixture is a bypass someone could plausibly write, and each names the
// rule that must catch it. Naming the rule is what makes the fixture useful: a
// fixture that only asserts "rejected" keeps passing when one rule dies and
// another happens to cover for it, which is exactly how a contract quietly
// stops working.

import { compiledSource, queryCalls } from './ejs-queries.mjs';
import { renderScenarios } from './render-coverage.mjs';
import { DEFAULT_SCENARIO, hostDocument, scenario } from './render-fixtures.mjs';
import { readOnlyViolations } from './sql-contract.mjs';

// SQL that must be rejected, by the rule named in `kinds`. Every kind listed
// must appear among the violations reported.
const REJECTED_SQL = [
  // The parser refuses `SELECT ... INTO` outright, and SQL that cannot be
  // parsed cannot be proven read-only. The `into` rule below covers the form
  // itself, on a statement the parser does accept.
  ['SELECT a INTO written FROM "App"', ['unreadable'], 'SELECT ... INTO writing a new table'],
  ['SELECT * INTO TEMP written FROM "App"', ['unreadable'], 'SELECT ... INTO TEMP writing a temporary table'],
  ['INSERT INTO "App" (a) VALUES (1)', ['into', 'statement-form'], 'writing INTO a table'],
  ['SELECT lo_create(0)', ['function'], 'lo_create creating a large object'],
  ['SELECT pg_advisory_unlock(1)', ['function'], 'pg_advisory_unlock releasing a lock'],
  ['SELECT pg_advisory_lock(1)', ['function'], 'pg_advisory_lock taking a lock'],
  ["SELECT lo_import('/etc/passwd')", ['function'], 'lo_import reading a server file'],
  ["SELECT setval('sequence_name', 1)", ['function'], 'setval moving a sequence'],
  ["SELECT nextval('sequence_name')", ['function'], 'nextval consuming a sequence'],
  ["SELECT pg_notify('channel', 'message')", ['function'], 'pg_notify raising a notification'],
  ["SELECT \"nextval\"('sequence_name')", ['function'], 'a quoted nextval'],
  ["SELECT pg_catalog.\"setval\"('sequence_name', 1)", ['function'], 'a schema-qualified quoted setval'],
  ['SELECT (SELECT lo_create(0))', ['function'], 'a writing call nested in a subquery'],
  ["SELECT 1 WHERE EXISTS (SELECT pg_notify('a', 'b'))", ['function'], 'a writing call inside EXISTS'],
  ['SELECT 1; DELETE FROM "App"', ['statement-form', 'node-form'], 'a second statement after a semicolon'],
  ['DELETE FROM "App"', ['statement-form', 'node-form'], 'a bare DELETE'],
  ["UPDATE \"App\" SET _status = 'x'", ['statement-form', 'node-form'], 'a bare UPDATE'],
  [
    'WITH removed AS (DELETE FROM "App" RETURNING *) SELECT * FROM removed',
    ['statement-form', 'node-form'],
    'a writing CTE'
  ],
  ['/* housekeeping */ DROP TABLE "App"', ['statement-form', 'node-form'], 'a comment-prefixed DROP'],
  [
    "SELECT * FROM \"Inspections\" WHERE _created_at BETWEEN '2024-01-01' AND '2024-03-31'",
    ['inclusive-range'],
    'an inclusive BETWEEN bound on a timestamp column'
  ],
  ['SELECT unknown_function(1)', ['function'], 'an unrecognized function'],
  ['SELECT evil.st_dwithin(a, b, 1)', ['function'], 'a schema-qualified allowlisted function name'],
  ['SELECT a FROM t UNION SELECT b FROM u', ['statement-form'], 'an unlisted statement form'],
  ['', ['unreadable'], 'empty SQL']
];

// SQL that must be accepted: the shapes the read-only examples actually use.
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

const READ_ONLY = 'SELECT * FROM "App" LIMIT 1';
const WRITE = 'DELETE FROM "App"';
// The same write with no quoting of its own, for fixtures that have to put the
// statement inside a nested JavaScript string.
const NESTED_WRITE = 'DELETE FROM app_table';

// A filter that reduces a value to letters and underscores, written where the
// value enters SQL.
const SAFE_FILTER = "String($params.q).replace(/[^a-zA-Z_]/g, '')";

function selectWhere(gap) {
  return `SELECT * FROM "App" WHERE q = '${gap}'`;
}

// How a QUERY() call must be judged:
//
//   read        the SQL was read out of the tree and the read-only contract
//               decided it
//   unreadable  something could not be read statically, so nothing was decided
//               and the template is refused
//   ignored     there is nothing here for this contract to find
//
// A refusal also names the rule that must produce it, because a fixture that
// only asserts "refused" keeps passing when one rule dies and another happens
// to cover for it.
const TEMPLATE_FIXTURES = [
  {
    because: 'a double-quoted string argument',
    template: `<% const removed = QUERY("${WRITE.replace(/"/g, '\\"')}", { format: 'json' }); %>`,
    findings: 1,
    outcome: 'read',
    rejected: true
  },
  {
    because: 'QUERY extracted through the arguments object',
    template:
      '<% const { "QUERY": run } = arguments[0]; run("DELETE FROM app_table"); %>',
    findings: 1,
    outcome: 'unreadable',
    rejected: true
  },
  {
    because: 'a shadowed String intrinsic in SQL filtering',
    template:
      '<% const String = (value) => ({ replace: () => value }); %>' +
      '<% QUERY(`SELECT * FROM "App" WHERE q = \'${String($params.q).replace(/[^A-Za-z0-9_-]/g, "")}\'`); %>',
    findings: 2,
    outcome: 'unreadable',
    rejected: true
  },
  {
    because: 'indirect Function construction',
    template:
      '<% String.constructor("l", "l.QUERY(\\"DELETE FROM app_table\\")")(arguments[0]); %>',
    findings: 2,
    outcome: 'unreadable',
    rejected: true
  },
  {
    because: 'Function reached through a static member',
    template: '<% globalThis["Function"]("QUERY(\\"DELETE FROM app_table\\")")(); %>',
    findings: 1,
    outcome: 'unreadable',
    rejected: true
  },
  {
    because: 'String shadowed through a function parameter',
    template:
      '<% ((String) => QUERY(`SELECT * FROM "App" WHERE q = \'${String($params.q).replace(/[^A-Za-z0-9_-]/g, "")}\'`))((value) => ({ replace: () => value })); %>',
    findings: 2,
    outcome: 'unreadable',
    rejected: true
  },
  {
    because: 'a comment between the name and its parenthesis',
    template: `<% const removed = QUERY /* comment */ (\`${WRITE}\`, { format: 'json' }); %>`,
    findings: 1,
    outcome: 'read',
    rejected: true
  },
  {
    because: 'a newline between the name and its parenthesis',
    template: `<% const removed = QUERY\n  (\`${WRITE}\`, { format: 'json' }); %>`,
    findings: 1,
    outcome: 'read',
    rejected: true
  },
  {
    because: 'a single-quoted string argument',
    template: `<% const removed = QUERY('${WRITE}', { format: 'json' }); %>`,
    findings: 1,
    outcome: 'read',
    rejected: true
  },
  {
    because: 'a tagged template',
    template: `<% const removed = QUERY\`${WRITE}\`; %>`,
    findings: 1,
    outcome: 'read',
    rejected: true
  },
  {
    because: 'a statement assembled in a variable',
    template: `<% const sql = '${WRITE}'; const removed = QUERY(sql, { format: 'json' }); %>`,
    findings: 1,
    outcome: 'unreadable',
    names: 'rather than a string or template literal',
    rejected: true
  },
  {
    because: 'a statement concatenated inline',
    template: `<% const removed = QUERY('DELETE ' + 'FROM "App"', { format: 'json' }); %>`,
    findings: 1,
    outcome: 'unreadable',
    names: 'rather than a string or template literal',
    rejected: true
  },
  {
    because: 'the helper aliased to another name',
    template: `<% const run = QUERY; const removed = run(\`${WRITE}\`); %>`,
    findings: 1,
    outcome: 'unreadable',
    names: 'referenced somewhere other than a direct call',
    rejected: true
  },
  {
    because: 'a call with no argument at all',
    template: '<% const removed = QUERY(); %>',
    findings: 1,
    outcome: 'unreadable',
    names: 'has no SQL argument',
    rejected: true
  },

  // The helper reached through the locals bag rather than by its bare name.
  // `ejs` opens that bag with `with`, so every one of these runs the same
  // function a bare call would.
  {
    because: 'the helper reached as a property of the locals bag',
    template: `<% const removed = locals.QUERY('${WRITE}'); %>`,
    findings: 1,
    outcome: 'read',
    rejected: true
  },
  {
    because: 'the helper reached with a string subscript',
    template: `<% const removed = locals['QUERY']('${WRITE}'); %>`,
    findings: 1,
    outcome: 'read',
    rejected: true
  },
  {
    because: 'the helper named by a variable subscript',
    template: `<% const name = 'QUERY'; const removed = locals[name]('${WRITE}'); %>`,
    findings: 1,
    outcome: 'unreadable',
    names: 'looked up with an expression rather than a literal',
    rejected: true
  },
  {
    because: 'the helper destructured out of the locals bag',
    template: `<% const { QUERY: run } = locals; const removed = run('${WRITE}'); %>`,
    findings: 1,
    outcome: 'unreadable',
    names: 'used as a value rather than read through a named property',
    rejected: true
  },
  {
    because: 'the locals bag copied to another name',
    template: `<% const bag = locals; const removed = bag.QUERY('${WRITE}'); %>`,
    findings: 2,
    outcome: 'unreadable',
    names: 'used as a value rather than read through a named property',
    rejected: true
  },
  {
    because: 'a member reference to the helper that is not itself the call',
    template: `<% const run = locals.QUERY; const removed = run('${WRITE}'); %>`,
    findings: 1,
    outcome: 'unreadable',
    names: 'referenced somewhere other than a direct call',
    rejected: true
  },
  {
    because: 'a statement built as text and run through eval',
    template: `<% const removed = eval("QUERY('${NESTED_WRITE}')"); %>`,
    findings: 1,
    outcome: 'unreadable',
    names: 'turns text into code',
    rejected: true
  },
  {
    because: 'a statement built as text and run through the Function constructor',
    template: `<% const run = new Function('Q', "return Q('${NESTED_WRITE}')"); run(QUERY); %>`,
    findings: 2,
    outcome: 'unreadable',
    names: 'turns text into code',
    rejected: true
  },

  // Interpolation. Reading the statement means replacing each gap with a
  // placeholder, and a placeholder only describes the statement that runs when
  // the gap is confined to characters that cannot leave the literal.
  {
    because: 'a parameter interpolated with nothing done to it',
    template: `<% const rows = QUERY(\`${selectWhere('${$params.q}')}\`, { format: 'json' }); %>`,
    findings: 1,
    outcome: 'unreadable',
    names: 'neither a fixed string nor an allowlist filter',
    rejected: true
  },
  {
    because: 'a filter whose allowlist still keeps the quote that ends the literal',
    template:
      `<% const rows = QUERY(\`${selectWhere("${String($params.q).replace(/[^a-zA-Z_']/g, '')}")}\`, ` +
      "{ format: 'json' }); %>",
    findings: 1,
    outcome: 'unreadable',
    names: 'still allows',
    rejected: true
  },
  {
    because: 'a filter whose allowlist is written with a shorthand this contract cannot expand',
    template:
      `<% const rows = QUERY(\`${selectWhere("${String($params.q).replace(/[^\\w-]/g, '')}")}\`, ` +
      "{ format: 'json' }); %>",
    findings: 1,
    outcome: 'unreadable',
    names: 'not a single negated character class',
    rejected: true
  },
  {
    because: 'a filter that removes only the first match',
    template:
      `<% const rows = QUERY(\`${selectWhere("${String($params.q).replace(/[^a-zA-Z_]/, '')}")}\`, ` +
      "{ format: 'json' }); %>",
    findings: 1,
    outcome: 'unreadable',
    names: 'only the g flag removes every occurrence',
    rejected: true
  },
  {
    because: 'a filter whose receiver is not known to be a string',
    template:
      `<% const rows = QUERY(\`${selectWhere("${($params.q || '').replace(/[^a-zA-Z_]/g, '')}")}\`, ` +
      "{ format: 'json' }); %>",
    findings: 1,
    outcome: 'unreadable',
    names: 'not known to be a string',
    rejected: true
  },
  {
    because: 'a value filtered somewhere other than the gap it is interpolated into',
    template:
      `<% const safe = ${SAFE_FILTER}; %>` +
      `<% const rows = QUERY(\`${selectWhere('${safe}')}\`, { format: 'json' }); %>`,
    findings: 1,
    outcome: 'unreadable',
    names: 'neither a fixed string nor an allowlist filter',
    rejected: true
  },
  {
    because: 'a filtered value interpolated outside any quoted literal',
    template:
      '<% const rows = QUERY(`SELECT * FROM "App" ' +
      "LIMIT ${String($params.n).replace(/[^0-9]/g, '')}`, { format: 'json' }); %>",
    findings: 1,
    outcome: 'unreadable',
    names: 'interpolated outside a quoted SQL string literal',
    rejected: true
  },
  {
    because: 'a value filtered in the gap it is interpolated into',
    template: `<% const rows = QUERY(\`${selectWhere(`\${${SAFE_FILTER}}`)}\`, { format: 'json' }); %>`,
    findings: 1,
    outcome: 'read',
    rejected: false
  },
  {
    because: 'a fixed string interpolated into a quoted literal',
    template: `<% const rows = QUERY(\`${selectWhere("${'complete'}")}\`, { format: 'json' }); %>`,
    findings: 1,
    outcome: 'read',
    rejected: false
  },

  {
    because: 'a read-only statement in a plain string',
    template: `<% const rows = QUERY('${READ_ONLY}', { format: 'json' }); %>`,
    findings: 1,
    outcome: 'read',
    rejected: false
  },
  {
    because: 'two calls in one template',
    template:
      `<% const a = QUERY(\`${READ_ONLY}\`, { format: 'json' }); %>\n` +
      '<% const b = QUERY(`SELECT * FROM "Other" LIMIT 1`, { format: \'json\' }); %>',
    findings: 2,
    outcome: 'read',
    rejected: false
  },
  {
    // A literal subscript names one thing and cannot become another, so
    // rejecting it would only push examples into worse shapes.
    because: 'a collection indexed by a literal',
    template: "<% const first = record.formValues.find('site_photo').items[0]; %>",
    findings: 0,
    outcome: 'ignored',
    rejected: false
  },
  {
    // The runtime helper is QUERY. A lowercase name is a different function and
    // reaches no database, so treating it as one would be a false report.
    because: 'a lowercase name that is not the runtime helper',
    template: `<% const removed = query('${WRITE}'); %>`,
    findings: 0,
    outcome: 'ignored',
    rejected: false
  }
];

// Rendered markup that must be judged correctly. A row emitted inside a loop is
// the case a static reader of the template never sees.
const MARKUP_FIXTURES = [
  {
    because: 'a row emitted inside a loop with no table around it',
    template: '<% [1, 2].forEach(function (n) { %><tr><td><%= n %></td></tr><% }); %>',
    valid: false
  },
  {
    because: 'a row emitted inside a loop inside a table',
    template:
      '<table><tbody><% [1, 2].forEach(function (n) { %><tr><td><%= n %></td></tr><% }); %></tbody></table>',
    valid: true
  },
  {
    because: 'an unclosed element',
    template: '<div><p>text</div>',
    valid: false
  }
];

const PRESENT = scenario('present', { fields: { site_id: { value: 'a' } }, rows: 2 });
const ABSENT = scenario('absent', { fields: {}, rows: 0 });

// Templates whose branches the given scenarios do or do not reach. `covered` is
// whether every branch ran; a fixture that expects `false` is the case the
// whole check exists for, so it must keep failing.
const COVERAGE_FIXTURES = [
  {
    because: 'an else whose scenarios never take it',
    template: "<% if (record.formValues.find('site_id')) { %><p>yes</p><% } else { %><p>no</p><% } %>",
    scenarios: [PRESENT],
    covered: false
  },
  {
    because: 'an if with no else that always tests true',
    template: "<% if (record.formValues.find('site_id')) { %><p>yes</p><% } %>",
    scenarios: [PRESENT],
    covered: false
  },
  {
    because: 'a loop body no scenario enters',
    template: "<% QUERY('SELECT 1').rows.forEach(function (row) { %><p>x</p><% }); %>",
    scenarios: [ABSENT],
    covered: false
  },
  {
    because: 'both outcomes of an if that has no else',
    template: "<% if (record.formValues.find('site_id')) { %><p>yes</p><% } %>",
    scenarios: [PRESENT, ABSENT],
    covered: true
  },
  {
    because: 'both outcomes of an if and a loop that runs',
    template:
      "<% if (record.formValues.find('site_id')) { %>" +
      "<% QUERY('SELECT 1').rows.forEach(function (row) { %><p>x</p><% }); %>" +
      '<% } else { %><p>none</p><% } %>',
    scenarios: [PRESENT, ABSENT],
    covered: true
  }
];

function sqlFailures() {
  const failures = [];

  for (const [sql, kinds, because] of REJECTED_SQL) {
    const reported = new Set(readOnlyViolations(sql).map(({ kind }) => kind));
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

// A finding is 'read' when its SQL was recovered statically, 'unreadable' when
// something was refused instead, and 'ignored' when there was nothing to find.
function outcomeOf(findings) {
  if (findings.length === 0) return 'ignored';
  return findings.some((finding) => finding.reason) ? 'unreadable' : 'read';
}

function templateFailures() {
  const failures = [];

  for (const fixture of TEMPLATE_FIXTURES) {
    let findings;
    try {
      findings = queryCalls(compiledSource(fixture.template, 'self-check.ejs'));
    } catch (error) {
      failures.push(`QUERY() discovery threw on ${fixture.because}: ${String(error.message).split('\n')[0]}`);
      continue;
    }

    if (findings.length !== fixture.findings) {
      failures.push(
        `QUERY() discovery made ${findings.length} findings instead of ${fixture.findings} for ${fixture.because}`
      );
      continue;
    }

    const outcome = outcomeOf(findings);
    if (outcome !== fixture.outcome) {
      failures.push(`QUERY() discovery treats ${fixture.because} as ${outcome} rather than ${fixture.outcome}`);
      continue;
    }

    const violations = findings.flatMap((finding) =>
      finding.reason ? [finding.reason] : readOnlyViolations(finding.sql).map(({ reason }) => reason)
    );

    if (fixture.names && !violations.some((reason) => reason.includes(fixture.names))) {
      failures.push(
        `QUERY() validation no longer rejects ${fixture.because} by the rule that says ` +
          `"${fixture.names}": ${violations.join('; ') || 'nothing was reported'}`
      );
      continue;
    }

    if (violations.length > 0 === fixture.rejected) continue;

    failures.push(
      fixture.rejected
        ? `QUERY() validation no longer rejects ${fixture.because}`
        : `QUERY() validation rejects ${fixture.because}: ${violations.join('; ')}`
    );
  }

  return failures;
}

// Every markup fixture is rendered and judged the same way a real template is,
// through the same renderer and the same host document, so what the fixtures
// prove is the check that actually runs.
async function markupFailures(validator) {
  const failures = [];

  for (const fixture of MARKUP_FIXTURES) {
    const { renders } = await renderScenarios(fixture.template, 'self-check.ejs', [DEFAULT_SCENARIO]);
    const [rendered] = renders;
    if (rendered.error) {
      failures.push(`markup fixture for ${fixture.because} does not render: ${rendered.error}`);
      continue;
    }

    const report = await validator.validateString(hostDocument(rendered.html), 'self-check.html');
    if (report.valid === fixture.valid) continue;

    failures.push(
      fixture.valid
        ? `rendered markup validation rejects ${fixture.because}`
        : `rendered markup validation no longer rejects ${fixture.because}`
    );
  }

  return failures;
}

async function coverageFailures() {
  const failures = [];

  for (const fixture of COVERAGE_FIXTURES) {
    const { renders, uncovered } = await renderScenarios(
      fixture.template,
      'self-check.ejs',
      fixture.scenarios
    );

    const broken = renders.find((rendered) => rendered.error);
    if (broken) {
      failures.push(`coverage fixture for ${fixture.because} does not render: ${broken.error}`);
      continue;
    }

    if ((uncovered.length === 0) === fixture.covered) continue;

    failures.push(
      fixture.covered
        ? `branch coverage reports ${fixture.because} as unreached: lines ${uncovered
            .map(({ line }) => line)
            .join(', ')}`
        : `branch coverage no longer reports ${fixture.because}`
    );
  }

  return failures;
}

// Returns { failures, total } — the reasons the contracts are no longer sound,
// and how many fixtures were exercised. `validator` is the same html-validate
// instance the repository's rendered output is held to, so the fixtures prove
// the configuration in use rather than a copy of it.
export async function selfCheck(validator) {
  return {
    failures: [
      ...sqlFailures(),
      ...templateFailures(),
      ...(await markupFailures(validator)),
      ...(await coverageFailures())
    ],
    total:
      REJECTED_SQL.length +
      ACCEPTED_SQL.length +
      TEMPLATE_FIXTURES.length +
      MARKUP_FIXTURES.length +
      COVERAGE_FIXTURES.length
  };
}
