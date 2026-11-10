import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const skill = fs.readFileSync(new URL('../plugins/fulcrum-ai-toolkit/skills/create-flow/SKILL.md', import.meta.url), 'utf8');
const normalizedSkill = skill.replace(/\s+/g, ' ');

test('FLOW guidance preserves discovery, platform and host capability boundaries', () => {
  for (const requirement of [
    'read-only discovery',
    'fulcrum_forms_get',
    'not currently supported or verified on iOS',
    'does not pass a JavaScript completion callback',
    'JSON serialization drops it',
    'end the response',
    'decision cases and default',
    'approval',
  ]) {
    assert.ok(normalizedSkill.includes(requirement), `Missing FLOW safeguard: ${requirement}`);
  }
});

test('read-only scaffold serializes to a reachable Android expression graph', () => {
  const snippet = skill.match(/```javascript\n([\s\S]*?)\n```/)?.[1];
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
  });
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
      assert.equal(vm.runInNewContext(node.input.expression).editor_read_error, true);
    }
  }
  assert.equal(graph.nodes[0].on_error, graph.nodes[1].id);
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
    const evaluated = vm.runInNewContext(`({ ${fragment} })`);
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
    const evaluated = vm.runInNewContext(`({ ${fragment} })`);
    const parsed = JSON.parse(JSON.stringify(evaluated));
    const expected = fragment.includes('{1}') ? 1 : fragment.match(/'([^']+)'/)[1];
    assert.equal(Object.values(parsed)[0], expected);
  }
  assert.ok(normalizedSkill.includes('Parentheses alone do not prevent'));
  assert.ok(normalizedSkill.includes('rather than deleting the assignment'));
});
