import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const skillsRoot = new URL('../plugins/fulcrum-ai-toolkit/skills/', import.meta.url);
const read = (file) => fs.readFileSync(new URL(file, skillsRoot), 'utf8');
const builder = read('fulcrum-app-builder/SKILL.md');
const performance = read('fulcrum-performance-review/SKILL.md');
const compact = (text) => text.replace(/\s+/g, ' ');
const approval = compact(builder.split('### Score And Advice At Every Design Confirmation')[1]?.split('## Step 4:')[0] ?? '');

test('every create/edit confirmation includes scoring, advice, and an informed choice', () => {
  assert.match(approval, /every.*design-confirmation prompt for creation or editing/);
  assert.match(approval, /new apps, edits, reapproval, and connector-independent handoffs/);
  for (const content of [
    'fulcrum-app-scorecard', 'Provisional', 'Not scoreable', 'evidence coverage',
    'What works', 'Improvement advice', 'Code performance', 'fulcrum-performance-review',
    'Revise the design', 'Proceed with this design', 'no minimum score required to proceed'
  ]) {
    assert.ok(approval.includes(content), `Missing approval contract: ${content}`);
  }
  assert.match(approval, /keep the honest score and findings/);
  assert.match(approval, /does not waive authorization, credential protection/);
});

test('assessment uses the composed edit and revisits material changes before writing', () => {
  const proposal = compact(builder.split('## Step 3: Propose The Schema')[1]?.split('## Step 4:')[0] ?? '');
  const build = compact(builder.split('## Step 4: Build Or Hand Off')[1]?.split('## Step 5:')[0] ?? '');
  assert.match(proposal, /read the current form before proposing/);
  assert.match(proposal, /Do not score only the diff/);
  assert.match(build, /Before persisting or handing off any authored or modified code/);
  assert.match(build, /actual composed artifact, including generated code and calculations/);
  assert.match(build, /return to Step 3 with an updated score and advice for approval/);
  assert.match(build, /reconcile intervening changes rather than overwriting/);
  const sequence = compact(read('fulcrum-app-builder/assets/app-build-sequence.txt'));
  assert.match(sequence, /show the proposed app score, constructive advice, and performance assessment/);
  assert.match(sequence, /Before this write, evaluate every authored\/generated code artifact/);
});

const codeSkills = [
  'fulcrum-app-builder', 'fulcrum-app-design', 'fulcrum-app-extensions',
  'fulcrum-data-events', 'fulcrum-report-building', 'fulcrum-query-api',
  'fulcrum-integration-patterns', 'fulcrum-data-migration', 'fulcrum-gis-mapping'
];

for (const name of codeSkills) {
  test(`${name} requires performance review without relying on router invocation`, () => {
    const text = compact(read(`${name}/SKILL.md`));
    assert.match(text, /\[.*fulcrum-performance-review.*\]\(\.\.\/fulcrum-performance-review\/SKILL\.md\)/);
    assert.match(text, /author(?:ing|ed).*modif(?:ying|ied).*code|author(?:ing|ed).*modif(?:ying|ied).*reviewing/);
    assert.match(text, /before delivery|before persistence|before presenting|before persisting/i);
  });
}

test('performance review distinguishes analysis from measurement and permits advisory trade-offs', () => {
  const text = compact(performance);
  for (const content of [
    'every code artifact', 'Static assessment', 'Measured', 'Unmeasured',
    'trigger', 'workload', 'N+1', 'memory', 'line count',
    'proceed as-is', 'not extra points, deductions, or caps',
    'Do not run production load tests', 'untrusted scripts'
  ]) {
    assert.ok(text.includes(content), `Missing performance contract: ${content}`);
  }
  assert.match(text, /does not turn an unknown into measured evidence/);
});

test('performance findings are wired into versioned scoring without a new ceiling', () => {
  const rubric = read('fulcrum-app-scorecard/resources/rubric.md');
  const logic = rubric.split('\n').find((line) => line.startsWith('| LOGIC-02 |'));
  const output = rubric.split('\n').find((line) => line.startsWith('| OUTPUT-02 |'));
  assert.match(logic, /workload-based performance evaluation/);
  assert.match(output, /query fan-out.*output-generation cost/);
  assert.match(rubric, /CAP-01 is the only cap in version 1\.1\.0/);
});

test('new approval and performance guidance links resolve in the portable bundle', () => {
  for (const file of [
    ...codeSkills.map((name) => `${name}/SKILL.md`),
    'fulcrum-performance-review/SKILL.md',
    'fulcrum-app-builder/resources/approval-cases.md'
  ]) {
    for (const [, link] of read(file).matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
      if (/^https?:\/\//.test(link)) continue;
      const target = new URL(link, new URL(file, skillsRoot));
      assert.ok(target.href.startsWith(skillsRoot.href), `${file}: ${link}`);
      assert.ok(fs.statSync(target).isFile(), `${file}: ${link}`);
    }
  }
});
