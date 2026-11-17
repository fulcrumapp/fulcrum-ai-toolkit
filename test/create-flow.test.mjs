import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const skill = fs.readFileSync(new URL('../plugins/fulcrum-ai-toolkit/skills/create-flow/SKILL.md', import.meta.url), 'utf8');
const normalizedSkill = skill.replace(/\s+/g, ' ');
const vmOptions = { timeout: 1000 };

test('FLOW guidance preserves discovery, platform and host capability boundaries', () => {
  for (const requirement of [
    'read-only discovery',
    'fulcrum_forms_get',
    'not currently supported or verified on iOS',
    'does not pass a JavaScript completion callback',
    'JSON serialization drops it',
    'detailed Mermaid flowchart at the end of the response',
    'decision cases and default',
    'approval',
  ]) {
    assert.ok(normalizedSkill.includes(requirement), `Missing FLOW safeguard: ${requirement}`);
  }
});

test('unsupported requests are explained without inventing working steps', () => {
  const section = skill.split(/^## Unsupported requests\s*$/m)[1]?.split(/^## /m)[0];
  assert.ok(section, 'Missing unsupported request guidance');
  const guidance = section.replace(/\s+/g, ' ');
  for (const requirement of [
    'tell the user plainly what cannot be done',
    'availability is unknown',
    'say it is unverified',
    'do not call it impossible',
    'ending a FLOW is not the same as closing or discarding a record editor',
    'contact the Fulcrum team',
    'Do not imply that a request has been submitted',
    "obtain the user's agreement",
    'one connected diagram',
    'do not insert an unsupported action into an executable graph',
  ]) {
    assert.ok(guidance.includes(requirement), `Missing unsupported request safeguard: ${requirement}`);
  }
});

test('diagram guidance separates compact grouping from the complete graph', () => {
  const section = skill.split(/^## Required diagram\s*$/m)[1]?.split(/^## /m)[0];
  assert.ok(section, 'Missing diagram guidance');
  const guidance = section.replace(/\s+/g, ' ');
  for (const requirement of [
    'decision cases and default',
    'two views of the same graph',
    'visually group related steps',
    'without merging executable nodes',
    'meaningful decisions and handled error routes',
    'Omit abort and cancellation paths that only terminate the run',
    'including implicit aborts',
    'verified additional functionality',
    'performs cleanup before termination',
    'when the user explicitly requests them',
    'Keep other workflow branches and handled error routes visible',
    'omissions do not change runtime behavior',
    'explain consequential termination behavior in prose',
    'never invent handling',
    'every node ID and kind',
    'explicit and implicit error and cancellation outcomes',
    'unhandled aborts',
    'same workflow',
    'expandable',
    'read-only or editable',
  ]) {
    assert.ok(guidance.includes(requirement), `Missing diagram safeguard: ${requirement}`);
  }
});

test('interactive authoring discovers the app, confirms the trigger, and proposes safe destinations', () => {
  const section = skill.split(/^## Interactive authoring\s*$/m)[1]?.split(/^## /m)[0];
  assert.ok(section, 'Missing interactive authoring guidance');
  const guidance = section.replace(/\s+/g, ' ');
  for (const requirement of [
    'ask one focused question at a time',
    'which app needs it',
    'authorized read-only discovery',
    "selected app's current schema",
    'what the user wants the initial FLOW to do',
    'Ask when it should run',
    'Recommend a verified lifecycle or field event',
    'confirm the choice when it is unclear',
    'identify a suitable existing field',
    'propose an appropriate new field',
    'do not assume one exists or change the schema',
    'Respect an explicit read-only request',
    'same current graph and composed handler',
    'preserving prior decisions',
    'Present both diagram views',
  ]) {
    assert.ok(guidance.includes(requirement), `Missing authoring workflow: ${requirement}`);
  }
});

test('expanded Android tools remain build-aware and distinguish permission from write approval', () => {
  const section = skill.split(/^## Tools and availability\s*$/m)[1]?.split(/^## /m)[0];
  assert.ok(section, 'Missing tool availability guidance');
  const guidance = section.replace(/\s+/g, ' ');
  for (const requirement of [
    'uncommitted Android development implementation',
    'search_records',
    'find_nearest_records',
    'current_location_tool',
    'navigate_to_record',
    'photo_capture_tool',
    'chat_photo_analyze_tool',
    'record_add_attachment_tool',
    'not available in an installed build until',
    'function-node-only',
    'debug glasses `capture_camera` tool and `navigate_to_activity` are not registered',
    '`(0, 0)` requests device GPS rather than literal coordinates',
    'omission defaults to the pole-inspection app',
    'first photo field',
    'photo context is isolated per FLOW run',
    '{recordId, navigated}',
    'error-first `FLOW(options, function(error, state) { ... })` callback',
    'Direct function-node record writes and attachments execute without an additional confirmation',
    'agentic confirmation follows a separate policy',
    'OS permission is not authorization to modify records',
    'cancel the initiating FLOW',
    'do not assume this combined tool provides an attachment reference',
  ]) {
    assert.ok(guidance.includes(requirement), `Missing tool safeguard: ${requirement}`);
  }
});

test('FLCRM-23901 tool contracts remain branch-specific and separate older candidates', () => {
  const section = skill.split(/^### FLCRM-23901 Android branch\s*$/m)[1]?.split(/^### |^## /m)[0];
  assert.ok(section, 'Missing FLCRM-23901 branch guidance');
  const guidance = section.replace(/\s+/g, ' ');
  for (const requirement of [
    '01a5c86311cff3db9b806ee17d7f597d3090fb3a',
    'branch-local contracts',
    'not evidence that the PR has been merged',
    'photo_capture_tool',
    "camera: 'front' \\| 'back'",
    'returns `{photo_id}`',
    'photo_analyze_tool',
    'findings` an array',
    'does not capture another photo',
    'flow_record_add_attachment_tool',
    '{attachment_id, record_id, queued: true}',
    'repeatable fields are not supported',
    'flow_saved_record_add_attachment_tool',
    'rejects the currently open record',
    'record_navigate_tool',
    '{destination_id, navigated}',
    'app_id` is ignored, not a scope check',
    'flow_find_nearest_records',
    'searches across apps',
    'idempotency key for each FLOW invocation',
    'do not assume a retry across invocations is deduplicated',
    'queued: true',
    'not processed or saved',
    'do not substitute `editor_attach_photo`',
    'does not pass a JavaScript completion callback',
  ]) {
    assert.ok(guidance.includes(requirement), `Missing branch contract: ${requirement}`);
  }
});

test('schema-driven question guidance distinguishes authoring discovery from runtime access', () => {
  const section = skill.split(/^### Schema-driven questions\s*$/m)[1]?.split(/^## /m)[0];
  assert.ok(section, 'Missing schema-driven question guidance');
  for (const requirement of [
    'authoring-time connection, not automatically a tool',
    'currently open form',
    'not an arbitrary second app',
    'only if a schema lookup tool',
    '`app_get_schema_tool` with `input.app_id`',
    'choices are permitted answers, not answers already saved in a record',
    'catalog definition alone does not register a handler',
    'not this schema tool',
    'that a target host actually registers it',
    'one applicable field question at a time',
    'Not all required fields are',
    'confirm unclear speech',
    'No, cancellation, a missing response',
    'self-reported',
    'capabilities are verified separately',
  ]) {
    assert.ok(section.replace(/\s+/g, ' ').includes(requirement), `Missing schema or voice safeguard: ${requirement}`);
  }
});

test('requested answers and suggestions update verified editor fields safely', () => {
  const section = skill.split(/^### Updating the current editor\s*$/m)[1]?.split(/^### |^## /m)[0];
  assert.ok(section, 'Missing current-editor update guidance');
  const guidance = section.replace(/\s+/g, ' ');
  for (const requirement of [
    'default to updating that field in the open editor',
    'unless the user requests read-only behavior',
    'Include explicit editor updates in the graph',
    'keeping values only in FLOW state or showing them in an alert does not update fields',
    'each destination field\'s key, type, and stored value format',
    'brakes, tires, or lights are not working',
    'Do not guess choice values',
    'ambiguous, missing, or cancelled answers',
    'validated typed identifier',
    'carry the actual generated output',
    'only when the meaning is unambiguous',
    'review and correct before saving',
    'avoid overwriting intervening user edits',
    'handle update failures explicitly',
    'not the saved record',
    'navigation may cancel the current FLOW',
  ]) {
    assert.ok(guidance.includes(requirement), `Missing editor update safeguard: ${requirement}`);
  }
});

test('interactive questions default to ask_user unless voice is explicitly requested', () => {
  const section = skill.split(/^### Interactive prompts\s*$/m)[1]?.split(/^## /m)[0];
  assert.ok(section, 'Missing interactive prompt guidance');
  const guidance = section.replace(/\s+/g, ' ');
  for (const requirement of [
    'Default to `ask_user` for user-facing questions',
    '`text` for free-form typed input',
    'appropriate choice or confirmation kind',
    'Use `voice_assistant` only when the user explicitly requests voice or speech',
    'including for spoken messages',
    'do not silently substitute voice',
    'Apply the same default to schema-driven questions',
    'explicit voice request still requires a verified voice host',
  ]) {
    assert.ok(guidance.includes(requirement), `Missing interaction default: ${requirement}`);
  }
});

test('camera selection and capture approval remain build-aware', () => {
  const section = skill.split(/^### Voice and photo\s*$/m)[1]?.split(/^### |^## /m)[0];
  assert.ok(section, 'Missing voice and photo guidance');
  const guidance = section.replace(/\s+/g, ' ');
  for (const requirement of [
    "input: { camera: 'back' }",
    'Verify the target build before passing `camera`',
    'fall back to the front camera',
    'does not confirm which camera was used',
    'Capture is automatic and headless',
    'capture only after an affirmative answer',
    "without the user's agreement",
  ]) {
    assert.ok(guidance.includes(requirement), `Missing camera safeguard: ${requirement}`);
  }
});

test('photo attachment guidance protects unsaved editor lifecycle', () => {
  const section = skill.split(/^### Voice and photo\s*$/m)[1]?.split(/^### |^## /m)[0];
  assert.ok(section, 'Missing voice and photo guidance');
  const guidance = section.replace(/\s+/g, ' ');
  for (const requirement of [
    '`photo_capture_tool` followed by `chat_photo_analyze_tool`',
    'targets a persisted record and saves it immediately',
    'not an attachment operation for an unsaved editor',
    'a captured ID alone does not establish that the attachment row exists',
    'Replacing a photo field can also remove existing photos',
    'existing-photo preservation',
    'save/cancel lifecycle',
    'Do not silently substitute a second capture',
  ]) {
    assert.ok(guidance.includes(requirement), `Missing unsaved-photo safeguard: ${requirement}`);
  }
});

test('new editor photo attachment remains candidate-scoped and asynchronous', () => {
  const section = skill.split(/^### Voice and photo\s*$/m)[1]?.split(/^### |^## /m)[0];
  assert.ok(section, 'Missing voice and photo guidance');
  const guidance = section.replace(/\s+/g, ' ');
  for (const requirement of [
    'A newer isolated Android candidate implements `editor_attach_photo`',
    '{photo_id, field_key}',
    'same FLOW run and account',
    '{photo_id, queued: true}',
    'processing can still fail',
    'record is not saved',
    'preserves existing photos',
    'end-to-end processing, save, and cancellation',
    'capture once and analyze that same capture',
    'queue it for the verified photo field before analysis',
    'source-file cleanup',
    'Do not fabricate findings or confidence',
    'retry may still fail',
    'retry already performed by the host',
    'unverified-result continuation',
  ]) {
    assert.ok(guidance.includes(requirement), `Missing candidate-photo safeguard: ${requirement}`);
  }
});

test('complete data events include requested lifecycle hooks without bypassing live-script safeguards', () => {
  const section = skill.split(/^## Complete data events\s*$/m)[1]?.split(/^## /m)[0];
  assert.ok(section, 'Missing complete data event guidance');
  const guidance = section.replace(/\s+/g, ' ');
  for (const requirement of [
    'JavaScript handler and its `FLOW(options)` graph together',
    "ON('new-record', handler)",
    "ON('edit-record', handler)",
    'not on each field change',
    'duplicate launches',
    'preserve unrelated handlers',
    'approval and freshness gates',
    'do not present an unintegrated snippet as the complete live script',
    'do not claim that it blocks editing or saving',
  ]) {
    assert.ok(guidance.includes(requirement), `Missing complete data event safeguard: ${requirement}`);
  }
});

test('read-only scaffold serializes to a reachable Android expression graph', () => {
  const scaffold = skill.split(/^## Read-only scaffold\s*$/m)[1]?.split(/^## /m)[0];
  const snippet = scaffold?.match(/```javascript\r?\n([\s\S]*?)\r?\n```/)?.[1];
  assert.ok(snippet, 'Missing FLOW scaffold');
  let graph;
  vm.runInNewContext(snippet, {
    ON(event, handler) {
      assert.equal(event, 'load-record');
      handler();
    },
    FLOW(...args) {
      assert.equal(args.length, 1, 'Android host does not deliver a JS callback');
      graph = JSON.parse(JSON.stringify(args[0]));
    },
  }, vmOptions);
  assert.equal(graph.schema_version, 1);
  assert.equal(graph.nodes[0].function, 'editor_read');
  const ids = new Set(graph.nodes.map((node) => node.id));
  for (const node of graph.nodes) {
    assert.match(node.id, /^[a-z][a-z0-9-]{0,63}$/);
    for (const target of [node.next, node.on_error].filter(Boolean)) {
      assert.ok(ids.has(target) || ['end', 'abort'].includes(target));
    }
    if (node.function === 'js') {
      assert.equal(typeof node.input.expression, 'string');
      assert.equal(node.input.run, undefined);
      assert.equal(vm.runInNewContext(node.input.expression, {}, vmOptions).editor_read_error, true);
    }
  }
  assert.equal(graph.nodes[0].on_error, graph.nodes[1].id);
});

test('function-shaped JS expressions remain strings and invoke the function', () => {
  const section = skill.split(/^## Target build and invocation\s*$/m)[1]?.split(/^## /m)[0];
  assert.ok(section, 'Missing target build guidance');
  const guidance = section.replace(/\s+/g, ' ');
  assert.ok(guidance.includes('declaration alone does not establish the Android bridge'));
  assert.ok(guidance.includes('parser rejects `input.run`'));
  const snippet = section.match(/```javascript\r?\n([\s\S]*?)\r?\n```/)?.[1];
  assert.ok(snippet, 'Missing function expression example');
  const nodeInput = vm.runInNewContext(`({ ${snippet} })`, {}, vmOptions).input;
  const wireInput = JSON.parse(JSON.stringify(nodeInput));
  assert.equal(typeof wireInput.expression, 'string');
  assert.equal(vm.runInNewContext(wireInput.expression, { state: { records: [{}] } }, vmOptions).found, true);
  assert.equal(vm.runInNewContext(wireInput.expression, { state: { records: [] } }, vmOptions).found, false);
  assert.deepEqual(JSON.parse(JSON.stringify({ run: () => ({ found: true }) })), {});
  const example = [...section.matchAll(/```javascript\r?\n([\s\S]*?)\r?\n```/g)][1]?.[1];
  assert.ok(example, 'Missing authored-function helper');
  const input = vm.runInNewContext(`${example}\ninput`, {}, vmOptions);
  const expression = JSON.parse(JSON.stringify(input)).expression;
  assert.equal(typeof expression, 'string');
  assert.equal(vm.runInNewContext(expression, { state: { records: [{}] } }, vmOptions).found, true);
  assert.equal(vm.runInNewContext(expression, { state: { records: [] } }, vmOptions).found, false);
  assert.ok(guidance.includes('Do not rely on handler closures'));
});

test('grouped option strings are JavaScript values, not JSON syntax', () => {
  for (const fragment of [
    "kind: ('function')",
    "kind: ('agentic')",
    "kind: ('decision')",
    "function: ('editor_read')",
    "op: ('gt')",
    "kind: ('single_choice')",
  ]) {
    assert.ok(normalizedSkill.includes(fragment), `Missing option example: ${fragment}`);
    const evaluated = vm.runInNewContext(`({ ${fragment} })`, {}, vmOptions);
    const parsed = JSON.parse(JSON.stringify(evaluated));
    assert.equal(Object.values(parsed)[0], fragment.match(/'([^']+)'/)[1]);
  }
  assert.throws(() => JSON.parse('{"kind":("function")}'), SyntaxError);
  assert.ok(normalizedSkill.includes('Node `kind` and prompt `kind` are different fields'));
});

test('editor literal assertions preserve the selected runtime value', () => {
  for (const fragment of [
    "kind: /** @type {'function'} */ ('function')",
    "op: /** @type {'gt'} */ ('gt')",
    "function: /** @type {'js'} */ ('js')",
    'schema_version: /** @type {1} */ (1)',
  ]) {
    assert.ok(normalizedSkill.includes(fragment), `Missing literal assertion: ${fragment}`);
    const evaluated = vm.runInNewContext(`({ ${fragment} })`, {}, vmOptions);
    const parsed = JSON.parse(JSON.stringify(evaluated));
    const expected = fragment.includes('{1}') ? 1 : fragment.match(/'([^']+)'/)[1];
    assert.equal(Object.values(parsed)[0], expected);
  }
  assert.ok(normalizedSkill.includes('Parentheses alone do not prevent'));
  assert.ok(normalizedSkill.includes('rather than deleting the assignment'));
});
