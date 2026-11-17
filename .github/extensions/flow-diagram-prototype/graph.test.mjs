import test from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { branchView, buildGraph, initialNodes, withDuplicateCheck } from './graph.mjs';

test('builds a sequential graph after adding, reordering and removing steps', () => {
  const nodes = [initialNodes[2], initialNodes[0], { id: 'bell', kind: 'function', function: 'voice_assistant', input: { message: 'Does the bell work?' } }];
  const graph = buildGraph(nodes);
  assert.equal(graph.schema_version, 1);
  assert.deepEqual(graph.nodes.map(node => node.id), ['tires', 'bike-photo', 'bell']);
  assert.deepEqual(graph.nodes.map(node => node.next), ['bike-photo', 'bell', undefined]);
  assert.equal(graph.nodes[2].input.message, 'Does the bell work?');
});

test('rejects invalid IDs, blank questions and unsupported graph semantics', () => {
  assert.throws(() => buildGraph([]), /1–50/);
  assert.throws(() => buildGraph([initialNodes[0], initialNodes[0]]), /duplicate/);
  assert.throws(() => buildGraph([{ ...initialNodes[1], input: { message: ' ' } }]), /voice question/);
  assert.throws(() => buildGraph([{ ...initialNodes[0], on_error: 'abort' }]), /Unsupported function/);
  assert.throws(() => buildGraph([{ ...initialNodes[0], next: 'missing' }]), /display order/);
});

test('builds agentic instructions and decision branches with real FLOW wire fields', () => {
  const graph = buildGraph([
    initialNodes[1],
    { id: 'check', kind: 'decision', cases: [{ when: { ref: 'state.answer', op: 'eq', value: 'yes' }, next: 'summarize' }], default: 'end' },
    { id: 'summarize', kind: 'agentic', instruction: 'Summarize the result.', interactive: false },
  ]);
  assert.equal(graph.nodes[0].next, 'check');
  assert.equal(graph.nodes[1].cases[0].next, 'summarize');
  assert.equal(graph.nodes[1].default, 'end');
  assert.equal(graph.nodes[2].instruction, 'Summarize the result.');
  assert.equal(graph.nodes[2].interactive, false);
});

test('rejects dangling and unreachable decision branches without silently changing them', () => {
  const decision = { id: 'check', kind: 'decision', cases: [{ when: { ref: 'state.answer', op: 'eq', value: 'yes' }, next: 'missing' }], default: 'end' };
  assert.throws(() => buildGraph([decision]), /missing target/);
  decision.cases[0].next = 'end';
  assert.throws(() => buildGraph([decision, initialNodes[0]]), /unreachable/);
  assert.throws(() => buildGraph([{ id: 'agent', kind: 'agentic', instruction: '', interactive: false }]), /agent instruction/);
});

test('branch view displays both actual decision targets and terminal outcomes', () => {
  const graph = buildGraph([
    { id: 'check', kind: 'decision', cases: [{ when: { ref: 'form.result', op: 'eq', value: 'Needs repair' }, next: 'repair' }], default: 'end' },
    { id: 'repair', kind: 'function', function: 'voice_assistant', input: { message: 'What needs repair?' } },
  ]);
  const view = branchView(graph.nodes);
  assert.equal(view.node.id, 'check');
  assert.equal(view.children[0].label, 'When matched');
  assert.equal(view.children[0].view.node.id, 'repair');
  assert.deepEqual(view.children[0].view.children[0].view, { type: 'terminal', id: 'end' });
  assert.equal(view.children[1].label, 'Otherwise');
  assert.deepEqual(view.children[1].view, { type: 'terminal', id: 'end' });
});

test('branch view bounds loops and shared paths and marks missing targets', () => {
  const nodes = [
    { id: 'check', kind: 'decision', cases: [{ when: { ref: 'state.answer', op: 'eq', value: 'yes' }, next: 'check' }], default: 'missing' },
  ];
  const view = branchView(nodes);
  assert.deepEqual(view.children[0].view, { type: 'reference', id: 'check' });
  assert.deepEqual(view.children[1].view, { type: 'missing', id: 'missing' });
  assert.equal(branchView([]), null);
});

test('duplicate lookup is serialized with safe input, error and result branches', () => {
  const graph = withDuplicateCheck(initialNodes);
  const byId = Object.fromEntries(graph.nodes.map(node => [node.id, node]));
  assert.equal(graph.nodes[0].id, 'ask-bike-number');
  assert.deepEqual(byId['ask-bike-number'].assign, { answer: '{{result.answer}}' });
  assert.deepEqual(byId['search-inspections'].input, {
    app_id: 'VERIFIED_APP_UUID', exact_field: 'VERIFIED_STORED_BIKE_FIELD_KEY',
    exact_value: '{{state.bike_number}}', limit: 1,
  });
  assert.deepEqual(byId['search-inspections'].assign, { candidate_count: '{{result.match_count}}' });
  for (const id of ['ask-bike-number', 'prepare-bike-number', 'search-inspections', 'no-local-match']) {
    assert.equal(byId[id].on_error, 'lookup-failed');
  }
  assert.equal(byId['check-bike-number'].default, 'search-inspections');
  assert.ok(byId['check-bike-number'].cases.every(branch => branch.next === 'lookup-failed'));
  assert.equal(byId['check-lookup-result'].cases[0].when.op, 'gt');
  assert.equal(byId['check-lookup-result'].cases[0].next, 'possible-match');
  assert.equal(byId['check-lookup-result'].cases[1].next, 'no-local-match');
  assert.equal(byId['check-lookup-result'].default, 'lookup-failed');
  assert.equal(byId['possible-match'].next, undefined);
  assert.equal(byId['no-local-match'].next, 'bike-photo');
  assert.equal(byId['lookup-failed'].next, undefined);
  assert.throws(() => withDuplicateCheck([{ ...initialNodes[0], id: 'lookup-failed' }]), /reserved/);
});

test('bike number preparation preserves case and leading zeros and flags date-shaped values', () => {
  const graph = withDuplicateCheck(initialNodes);
  const expression = graph.nodes.find(node => node.id === 'prepare-bike-number').input.expression;
  for (const [answer, number, dateShaped] of [['  Ab001  ', 'Ab001', false], ['2026-01-03', '2026-01-03', true], ['', '', false]]) {
    const result = runInNewContext(expression, { state: { answer } });
    assert.equal(result.bike_number, number);
    assert.equal(result.date_shaped, dateShaped);
  }
});

test('branch view includes every decision case and explicit error routes', () => {
  const graph = withDuplicateCheck(initialNodes);
  const view = branchView(graph.nodes);
  assert.deepEqual(view.children.map(child => child.label), ['Success', 'Error']);
  const inputCheck = view.children[0].view.children[0].view;
  assert.equal(inputCheck.node.id, 'check-bike-number');
  assert.deepEqual(inputCheck.children.map(child => child.label), ['Case 1', 'Case 2', 'Otherwise']);
  assert.equal(inputCheck.children[2].view.node.id, 'search-inspections');
});

test('compact view shows lookup outcomes without changing input checks or error handling in JSON', () => {
  const graph = withDuplicateCheck(initialNodes);
  const original = JSON.stringify(graph);
  const view = branchView(graph.nodes, { compactLookup: true });
  assert.equal(view.children.length, 1);
  const search = view.children[0].view;
  assert.equal(search.node.id, 'search-inspections');
  assert.equal(search.children.length, 1);
  const result = search.children[0].view;
  assert.deepEqual(result.children.map(child => child.label), ['Possible match', 'No local match']);
  assert.equal(result.children[0].view.node.id, 'possible-match');
  assert.equal(result.children[1].view.node.id, 'no-local-match');
  assert.equal(JSON.stringify(graph), original);
});
