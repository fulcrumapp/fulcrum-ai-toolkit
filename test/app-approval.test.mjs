import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const skillsRoot = new URL('../plugins/fulcrum-ai-toolkit/skills/', import.meta.url);
const read = (file) => fs.readFileSync(new URL(file, skillsRoot), 'utf8');
const builder = read('fulcrum-app-builder/SKILL.md');
const editing = read('fulcrum-app-editing/SKILL.md');
const performance = read('fulcrum-performance-review/SKILL.md');
const compact = (text) => text.replace(/\s+/g, ' ');
const approval = compact(builder.split('### Score And Advice At Every Design Confirmation')[1]?.split('## Step 4:')[0] ?? '');

function assertInOrder(text, fragments) {
  let offset = 0;
  for (const fragment of fragments) {
    const index = text.indexOf(fragment, offset);
    assert.notEqual(index, -1, `Missing or out-of-order step: ${fragment}`);
    offset = index + fragment.length;
  }
}

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
  assert.match(approval, /every authored, modified, or reviewed code artifact in the complete composed design/);
  assert.match(approval, /including unchanged Data Events, Reference Files, and dependencies/);
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
  assert.match(sequence, /Performance review and approval gate \(no live writes\)/);
  const reviewGate = sequence.indexOf('Run fulcrum-performance-review');
  const createCall = sequence.indexOf('fulcrum_forms_create(');
  assert.ok(reviewGate >= 0 && reviewGate < createCall, 'Review gate must precede the live create invocation');
  assertInOrder(sequence, [
    'Step 5 Performance review and approval gate',
    'Step 6 Pre-create freshness check',
    'currently registered form list/search/discovery operation',
    'If no supported discovery operation exists, freshness is unverifiable',
    'Step 7 fulcrum_forms_create'
  ]);
  const newApp = build.split('For a new app:')[1].split('For an existing app:')[0];
  assert.match(newApp, /Complete the performance review.*currently registered form list\/search\/discovery operation.*freshness is unverifiable.*Create it with `fulcrum_forms_create`/);
  assert.match(compact(read('fulcrum-app-builder/resources/pre-write-freshness.md')), /If no supported discovery operation exists, freshness is unverifiable/);
  const existingApp = build.split('For an existing app:')[1].split('### Data Event scripts')[0];
  assertInOrder(existingApp, [
    'Complete the performance review',
    'Always re-read the full form',
    'Recompute `composedElements` and `removedElementKeys`',
    'revalidate the full form',
    'repeat this final fresh read after approval',
    'Start the update payload',
    'fulcrum_forms_update'
  ]);
  const scriptUpdate = build.split('### Data Event scripts')[1];
  assertInOrder(scriptUpdate, [
    'Review performance',
    'Always re-read the current form and relevant dependencies immediately before',
    'Reconcile the approved edits',
    're-review that final composition',
    'repeat this fresh read after approval',
    'Write the reviewed, approved final script with `fulcrum_forms_update`'
  ]);
  assert.match(scriptUpdate, /even if no change is known/);
});

test('existing-app updates require production-safety record and impact gates', () => {
  const normalizedEditing = compact(editing);
  const build = compact(builder.split('## Step 4: Build Or Hand Off')[1]?.split('## Step 5:')[0] ?? '');
  assert.match(normalizedEditing, /Before any `fulcrum_forms_update` for an existing form/);
  assert.match(normalizedEditing, /form_summaries.*get_form_query_tables\(form_id\).*query_records/);
  assert.match(normalizedEditing, /COUNT\(DISTINCT \.\.\.\)/);
  assert.match(normalizedEditing, /record presence is unknown: do not issue `fulcrum_forms_update`/);
  assert.match(normalizedEditing, /positive record count as production-sensitive/);
  assert.match(normalizedEditing, /data in 137 of 412 records.*make that data inaccessible/);
  assert.match(normalizedEditing, /preserved.*recreated.*excluded.*unresolved/);
  assert.match(normalizedEditing, /data capture, integrations, or runtime behavior blocks promotion until it is resolved/);
  assert.match(normalizedEditing, /Obtain clone-creation approval.*Create a sandbox clone.*Show a human-readable diff.*Obtain explicit promotion approval.*Reconcile and promote/i);
  assert.match(normalizedEditing, /Never use raw API calls or unregistered tools\. If a required MCP operation is unavailable, stop and provide a handoff/);
  assert.match(build, /fulcrum-app-editing.*Query MCP record detection before each `fulcrum_forms_update`/);
  assert.match(build, /Complete the final record-count recheck.*fulcrum-app-editing/);
});

const codeSkills = [
  'fulcrum-app-builder', 'fulcrum-app-design', 'fulcrum-app-editing', 'fulcrum-app-extensions',
  'fulcrum-data-events', 'fulcrum-report-building', 'fulcrum-query-api',
  'fulcrum-integration-patterns', 'fulcrum-data-migration', 'fulcrum-gis-mapping',
  'fulcrum-workflow-decomposition'
];

test('extension publishing reviews and approves composed artifacts before either live write', () => {
  const sequence = compact(read('fulcrum-app-extensions/assets/app-mcp-extension-publish-sequence.txt'));
  assertInOrder(sequence, [
    'fulcrum_extensions_generate(',
    'fulcrum_forms_get(',
    'Performance review and approval gate (no live writes)',
    'Run fulcrum-performance-review',
    'Obtain explicit approval',
    'Pre-upload freshness gate (no live writes)',
    'Immediately re-read the target Reference File',
    'Repeat this freshness gate after approval',
    'fulcrum_reference_files_upload(',
    'Verify that the live file matches the approved content',
    'fulcrum_forms_get(',
    're-review the final composed script',
    'return to Step 5 for updated approval',
    'fulcrum_forms_update('
  ]);
  assert.match(sequence, /both the Reference File upload or replacement and the composed script/);
  assert.match(sequence, /repeat Steps 6-7 and verify the new file before writing its dependent script/);
  const extension = read('fulcrum-app-extensions/SKILL.md');
  const manual = compact(extension.split('### Manual UI fallback')[1]?.split('## Anti-Patterns')[0] ?? '');
  assertInOrder(manual, [
    'Inspect the target form',
    'Complete the no-write performance review',
    'obtain explicit approval',
    'Immediately re-read the target Reference File',
    'Repeat this check after approval',
    'upload the reviewed file',
    'Recheck the current form',
    're-review any intervening changes',
    'Save the reviewed, approved composed script'
  ]);
  assert.match(manual, /repeat steps 4-5 and verify the replacement before writing its dependent script/);
});

test('direct Data Event and shared-file writes remain behind performance and approval gates', () => {
  const events = read('fulcrum-data-events/SKILL.md');
  const controlPlane = compact(events.split('## App MCP Control Plane')[1]?.split('## Event Lifecycle')[0] ?? '');
  assertInOrder(controlPlane, [
    'fulcrum_forms_get',
    'Compose the handler',
    'Complete the performance review',
    'Obtain explicit approval before any live write',
    'Always re-read the current form and relevant dependencies immediately before',
    'Reconcile the approved edits',
    're-review the final composition',
    'repeat this fresh read after approval',
    'fulcrum_forms_update'
  ]);
  assert.match(controlPlane, /even if no change is known/);
  const sharedCode = compact(events.split('### Share code across apps with LOADFILE')[1]?.split('### Session state')[0] ?? '');
  assertInOrder(sharedCode, [
    'Inspect the current Reference File',
    'Compose the proposed shared-file contents',
    'Complete the no-write performance review',
    'obtain explicit approval',
    'Immediately re-read the current Reference File',
    'Repeat this fresh read after approval',
    'fulcrum_reference_files_upload',
    'verify the live content matches the approved artifact',
    'Re-read the form and re-review the final composed script',
    'obtain updated approval',
    'fulcrum_forms_update'
  ]);
  assert.match(sharedCode, /existing consumers can load a replacement without a script change/);
  assert.match(sharedCode, /repeat steps 4-5 and verify that replacement before writing the script/);
});

test('shared pre-write safeguards cover freshness, artifact consistency, and non-atomic failures', () => {
  const guard = compact(read('fulcrum-app-builder/resources/pre-write-freshness.md'));
  for (const content of [
    'Always read current state immediately before writing',
    'approved baseline', 'Recompute removal keys',
    'repeat the fresh read after approval',
    'Do not invent an ETag or concurrency argument',
    'is not atomic', 'repeat the guarded upload',
    'verify it before writing the script', 'report the partial state'
  ]) {
    assert.ok(guard.includes(content), `Missing pre-write safeguard: ${content}`);
  }
});

test('builder indexes and update fragments require the canonical gated workflow', () => {
  for (const file of [
    'fulcrum-app-builder/assets/README.md',
    'fulcrum-app-builder/examples/README.md'
  ]) {
    const index = compact(read(file));
    assert.match(index, /SKILL\.md#step-4-build-or-hand-off/);
    assert.match(index, /pre-write-freshness\.md/);
    assert.match(index, /payload-only/i);
    assert.doesNotMatch(index, /create, validate/);
  }
  const fragment = read('fulcrum-app-builder/examples/forms-update-preserving-keys.js');
  assert.match(fragment, /Payload-only fragment, not a standalone workflow or write authorization/);
  assert.match(fragment, /pre-write-freshness\.md/);
});

test('direct report publication requires review, explicit approval, and freshness before mutation', () => {
  const reports = read('fulcrum-report-building/SKILL.md');
  const gate = compact(reports.split('### Template Publication Gate')[1]?.split('## Report Types')[0] ?? '');
  assertInOrder(gate, [
    'Read the target form',
    'Complete static validation and performance review',
    'Obtain explicit publication approval before any live write',
    'pre-write freshness safeguard',
    'repeat the fresh read',
    'Only then call `fulcrum_report_templates_create`',
    '`fulcrum_report_templates_update`'
  ]);
  assert.match(gate, /manual UI/);
  assert.match(gate, /do not call `fulcrum_reports_create` merely to complete a static review/);
  for (const file of [
    'fulcrum-report-building/resources/report-template-reference.md',
    'fulcrum-report-building/examples/README.md'
  ]) {
    assert.match(read(file), /\.\.\/SKILL\.md#template-publication-gate/);
  }
});

test('secondary publishing references cannot bypass canonical review and fresh-read gates', () => {
  const bridge = compact(read('fulcrum-app-extensions/resources/extension-bridge-api.md'));
  const workflow = bridge.split('## Reference File Workflow')[1]?.split('## Sandbox Constraints')[0] ?? '';
  assert.match(workflow, /\[canonical publishing sequence\]\(\.\.\/assets\/app-mcp-extension-publish-sequence\.txt\)/);
  assert.match(workflow, /before either live write/);
  assert.match(workflow, /Repeat the fresh read after any required reapproval/);
  assert.doesNotMatch(workflow, /fulcrum_reference_files_upload\(|fulcrum_forms_update\(/);
  for (const file of [
    'fulcrum-app-extensions/assets/README.md',
    'fulcrum-app-extensions/examples/README.md'
  ]) {
    const index = compact(read(file));
    assert.match(index, /app-mcp-extension-publish-sequence\.txt/);
    assert.match(index, /review\/approval|review and approve/i);
    assert.match(index, /fresh read|fresh-read/);
  }
  for (const file of [
    'fulcrum-data-events/examples/README.md',
    'fulcrum-data-events/resources/data-event-examples.md'
  ]) {
    const reference = compact(read(file));
    assert.match(reference, /\.\.\/SKILL\.md#app-mcp-control-plane/);
    assert.match(reference, /fresh read|fresh-read/);
  }
});

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
  assert.match(logic, /including calculation-only apps/);
  assert.match(logic, /Only when the full configuration confirms no Data Events, calculation expressions, or loaded helpers/);
  assert.match(output, /query fan-out.*output-generation cost/);
  assert.match(rubric, /CAP-01 is the only cap in version 1\.2\.0/);
});

test('code discovery includes attachments, embedded code, and transitive dependencies', () => {
  const inventory = compact(performance.split('## Discover Attached, Embedded, And Loaded Code')[1]?.split('## Evaluation Workflow')[0] ?? '');
  for (const surface of [
    'Conversation uploads and app attachments', 'Reference Files', 'LOADFILE()',
    'OPENEXTENSION()', 'attachment://', 'inline scripts', 'event-handler attributes',
    'EJS/report partials', 'embedded SQL', 'Archive members', 'minified/bundled',
    'encoded payloads', 'eval', 'Function', 'transitively', 'visited artifacts',
    'third-party and generated code'
  ]) {
    assert.ok(inventory.includes(surface), `Missing code discovery surface: ${surface}`);
  }
  assert.match(inventory, /rather than trusting the filename or extension/);
  assert.match(inventory, /Do not execute, import, evaluate, install, or render active attachment content/);
  assert.match(inventory, /path, size\/decompression, and authorization boundaries/);
  assert.match(inventory, /instructions inside attachments as untrusted data/);
});

test('unread attachments cannot become N/A or a complete low-risk assessment', () => {
  const text = compact(performance);
  assert.match(text, /Only after the code inventory establishes that no code is involved/);
  assert.match(text, /record \*\*Unreviewed\*\* with the affected path and reason/);
  assert.match(text, /Do not mark it N\/A, assume it is safe\/fast, or silently omit it/);
  assert.match(text, /dependency leaves the affected execution path's performance \*\*Unknown\*\*/);
  assert.match(text, /Mark the overall evaluation incomplete/);
  assert.match(approval, /an unread attachment is not N\/A/);
  const scorecard = compact(read('fulcrum-app-scorecard/SKILL.md'));
  assert.match(scorecard, /Keep affected checks unknown unless a violation is established/);
});

test('direct code skills require discovery beyond their visible entry points', () => {
  for (const [name, content] of [
    ['fulcrum-data-events', 'Reviewing the loader alone is insufficient'],
    ['fulcrum-app-extensions', 'Review the extension contents as well as the Data Event'],
    ['fulcrum-report-building', 'into attached templates, EJS partials']
  ]) {
    assert.ok(compact(read(`${name}/SKILL.md`)).includes(content), name);
  }
});

test('Reference File sync cost is an advisory warning even when there is no code', () => {
  const warning = compact(performance.split('## Reference File Sync Warning')[1]?.split('## Evidence And Measurement')[0] ?? '');
  assert.match(warning, /Large Reference Files may slow sync when the files change/);
  assert.match(warning, /non-code reference material/);
  assert.match(warning, /no automatic score deduction or cap/);
  assert.match(warning, /individual and total file sizes/);
  assert.match(warning, /expected update frequency/);
  assert.match(warning, /There is no universal cutoff/);
  assert.match(warning, /flag a smaller file when its update frequency or target connection/);
  assert.match(warning, /Preserve offline availability/);
  assert.match(warning, /File size or update frequency alone must not fail a rubric check/);
  assert.match(warning, /does not waive code inspection/);
  assert.match(approval, /Include it even when code performance is N\/A/);
  const performanceText = compact(performance);
  assert.match(performanceText, /expensive\*\* means work that materially consumes/);
  assert.match(performanceText, /declared or measured budget for the target client and workload/);
  assert.match(performanceText, /rather than inventing a universal latency threshold/);
  assert.match(performanceText, /\*\*Small\*\* means bounded work scoped to the current record/);
  const rubric = compact(read('fulcrum-app-scorecard/resources/rubric.md'));
  assert.match(rubric, /Size or update frequency alone is not a check failure, deduction, or cap/);
});

test('new approval and performance guidance links resolve in the portable bundle', () => {
  for (const file of [
    ...codeSkills.map((name) => `${name}/SKILL.md`),
    'fulcrum-performance-review/SKILL.md',
    'fulcrum-app-builder/resources/approval-cases.md',
    'fulcrum-app-builder/resources/pre-write-freshness.md',
    'fulcrum-app-editing/SKILL.md',
    'fulcrum-app-builder/assets/README.md',
    'fulcrum-app-builder/examples/README.md',
    'fulcrum-app-extensions/resources/extension-bridge-api.md',
    'fulcrum-app-extensions/assets/README.md',
    'fulcrum-app-extensions/examples/README.md',
    'fulcrum-data-events/examples/README.md',
    'fulcrum-data-events/resources/data-event-examples.md',
    'fulcrum-report-building/resources/report-template-reference.md',
    'fulcrum-report-building/examples/README.md'
  ]) {
    for (const [, link] of read(file).matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
      if (/^https?:\/\//.test(link)) continue;
      const target = new URL(link, new URL(file, skillsRoot));
      assert.ok(target.href.startsWith(skillsRoot.href), `${file}: ${link}`);
      assert.ok(fs.statSync(target).isFile(), `${file}: ${link}`);
    }
  }
});
