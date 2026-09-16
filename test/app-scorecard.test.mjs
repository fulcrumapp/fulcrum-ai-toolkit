import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const skillRoot = new URL('../plugins/fulcrum-ai-toolkit/skills/fulcrum-app-scorecard/', import.meta.url);
const read = (file) => fs.readFileSync(new URL(file, skillRoot), 'utf8');
const skill = read('SKILL.md');
const rubric = read('resources/rubric.md');
const cases = read('resources/worked-cases.md');
const checkIds = [
  'GOAL-01', 'GOAL-02', 'STRUCT-01', 'STRUCT-02', 'FIELD-01', 'FIELD-02',
  'MOBILE-01', 'MOBILE-02', 'FLOW-01', 'FLOW-02', 'LOGIC-01', 'LOGIC-02',
  'OFFLINE-01', 'OFFLINE-02', 'EXT-01', 'EXT-02', 'OUTPUT-01', 'OUTPUT-02',
  'PROTECT-01', 'PROTECT-02'
];

function rows(markdown) {
  return markdown.split('\n')
    .filter((line) => line.startsWith('| '))
    .map((line) => line.split('|').slice(1, -1).map((cell) => cell.trim()));
}

test('rubric 1.0.0 retains twenty stable checks and the six-point repeatable ceiling', () => {
  assert.match(skill, /Rubric version: 1\.0\.0/);
  assert.match(skill, /P \+ F \+ U \+ N = 20/);
  assert.match(rubric, /^# App Design Rubric 1\.0\.0/m);
  assert.match(cases, /rubric 1\.0\.0/);
  const checks = rows(rubric).filter(([id]) => /^[A-Z]+-\d{2}$/.test(id) && !id.startsWith('CAP-'));
  assert.deepEqual(checks.map(([id]) => id), checkIds);
  assert.ok(checks.every((row) => row.length === 4 && row.every(Boolean)));
  const caps = rows(rubric).filter(([id]) => /^CAP-\d{2}$/.test(id));
  assert.equal(caps.length, 1);
  assert.equal(caps[0][0], 'CAP-01');
  assert.equal(caps[0][2], '6');
});

test('scorecard relative references resolve within the installed skill bundle', () => {
  for (const file of ['SKILL.md', 'resources/rubric.md', 'resources/worked-cases.md']) {
    const documentUrl = new URL(file, skillRoot);
    for (const [, link] of read(file).matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
      if (/^https?:\/\//.test(link)) continue;
      const target = new URL(link, documentUrl);
      assert.ok(target.href.startsWith(new URL('../', skillRoot).href), `${file}: ${link}`);
      assert.ok(fs.statSync(target).isFile(), `${file}: ${link}`);
    }
  }
});

// These check the published examples' arithmetic, not an agent's app inspection.
const workedCases = rows(cases).filter((row) => /^\d+\/\d+\/\d+\/\d+$/.test(row[2] ?? ''));
test('the complete calibration case set is exercised', () => {
  assert.equal(workedCases.length, 12);
});

const display = (value) => (Math.round(value * 10) / 10).toFixed(1);
const range = (low, high) => low === high ? display(low) : `${display(low)}-${display(high)}`;

for (const [name, , counts, uncapped, cap, final, coverage] of workedCases) {
  test(`published scoring case: ${name}`, () => {
    const [pass, fail, unknown, excluded] = counts.split('/').map(Number);
    assert.equal(pass + fail + unknown + excluded, checkIds.length);
    assert.ok(['Triggered', 'Triggered once', 'Not triggered', 'Unknown'].includes(cap));
    const applicable = pass + fail + unknown;
    assert.equal(coverage, `${display(100 * (pass + fail) / applicable)}%`);
    if (pass + fail === 0) {
      assert.equal(uncapped, 'Not scoreable');
      assert.equal(final, 'Not scoreable');
      return;
    }
    const low = 1 + 9 * pass / applicable;
    const high = 1 + 9 * (pass + unknown) / applicable;
    assert.equal(uncapped, range(low, high));
    const confirmedCeiling = cap.startsWith('Triggered') ? 6 : 10;
    const possibleCeiling = cap === 'Unknown' ? 6 : 10;
    const finalLow = Math.min(low, confirmedCeiling, possibleCeiling);
    const finalHigh = Math.min(high, confirmedCeiling);
    const expected = unknown || cap === 'Unknown'
      ? `Provisional ${display(finalLow)}-${display(finalHigh)}`
      : display(finalLow);
    assert.equal(final, expected);
    if (cap.startsWith('Triggered')) assert.ok(finalHigh <= 6);
    assert.ok(finalLow <= low && finalHigh <= high);
  });
}
