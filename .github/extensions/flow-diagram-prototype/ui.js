import { branchView, withDuplicateCheck } from './graph.mjs';

const nodesElement = document.querySelector('#nodes');
const graphElement = document.querySelector('#graph');
const flowElement = document.querySelector('#flow-view');
const statusElement = document.querySelector('#status');
let nodes = [];
let revision = 0;
let dirty = false;
let editVersion = 0;

const types = {
  voice_assistant: 'Ask a voice question',
  photo_analyze_tool: 'Analyze a photo',
  editor_read: 'Read the current record',
  agentic: 'Agentic instruction',
  decision: 'Decision branch',
};
const lookupNames = {
  'ask-bike-number': 'Ask for bike number',
  'prepare-bike-number': 'Prepare bike number',
  'check-bike-number': 'Bike number usable?',
  'search-inspections': 'Search local inspections',
  'check-lookup-result': 'Possible match found?',
  'possible-match': 'Notify of possible match',
  'no-local-match': 'Notify of no local match',
  'lookup-failed': 'Unable to check',
};

function editableNodes() {
  return nodes.map((node, index) => {
    const output = JSON.parse(JSON.stringify(node));
    if (node.kind !== 'decision' && nodes[index + 1]) output.next = nodes[index + 1].id;
    return output;
  });
}

function graph() {
  return withDuplicateCheck(editableNodes());
}

function preview() {
  try {
    const current = graph();
    graphElement.textContent = JSON.stringify(current, null, 2);
    renderFlow(current.nodes);
    statusElement.textContent = dirty ? 'Unsaved changes' : 'Saved';
  } catch (error) {
    graphElement.textContent = '';
    flowElement.replaceChildren();
    statusElement.textContent = error.message;
  }
}

function renderFlow(currentNodes) {
  const root = branchView(currentNodes, { compactLookup: true });
  flowElement.replaceChildren();
  if (!root) return;
  const start = document.createElement('div');
  start.className = 'flow-endpoint';
  start.textContent = 'NEW RECORD ONLY';
  flowElement.append(start, renderPath(root));
}

function renderPath(view) {
  const path = document.createElement('div');
  path.className = 'flow-path';
  if (view.type !== 'node') {
    const endpoint = document.createElement('div');
    endpoint.className = `flow-endpoint ${view.type}`;
    endpoint.textContent = view.type === 'terminal' ? view.id.toUpperCase()
      : view.type === 'reference' ? `See ${view.id}`
      : `Missing target: ${view.id}`;
    path.append(endpoint);
    return path;
  }
  const { children } = view;
  const node = view.node;
  const isLookup = !nodes.some(item => item.id === node.id);
  const card = document.createElement(isLookup ? 'div' : 'button');
  if (!isLookup) card.type = 'button';
  card.className = `flow-node ${node.kind}${isLookup ? ' proposal-node' : ''}`;
  const kind = document.createElement('span');
  kind.className = 'flow-kind';
  kind.textContent = isLookup ? `Lookup · ${node.kind}` : node.kind;
  const name = document.createElement('strong');
  name.textContent = lookupNames[node.id] ?? node.id;
  const detail = document.createElement('span');
  if (isLookup) {
    detail.textContent = node.kind === 'decision' ? '' : node.input.message ?? types[node.function] ?? node.function;
  } else if (node.kind === 'decision') {
    detail.textContent = node.cases.map(({ when }) => `${when.ref} ${when.op} ${String(when.value) || '(empty)'}`).join('; ');
  } else {
    detail.textContent = node.kind === 'agentic' ? node.instruction : (types[node.function] ?? node.function);
  }
  card.append(kind, name, detail);
  if (!isLookup) {
    card.addEventListener('click', () => {
      const index = nodes.findIndex(item => item.id === node.id);
      nodesElement.children[index]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      nodesElement.children[index]?.querySelector('input')?.focus({ preventScroll: true });
    });
  }
  path.append(card);
  const branches = document.createElement('div');
  branches.className = children.length > 1 ? 'flow-branches split' : 'flow-branches';
  for (const child of children) {
    const branch = document.createElement('div');
    branch.className = 'flow-branch';
    if (child.label) {
      const label = document.createElement('span');
      label.className = 'branch-label';
      label.textContent = child.label;
      branch.append(label);
    }
    branch.append(renderPath(child.view));
    branches.append(branch);
  }
  path.append(branches);
  return path;
}

function field(label, element) {
  const wrapper = document.createElement('label');
  wrapper.textContent = label;
  wrapper.appendChild(element);
  return wrapper;
}

function button(text, title, action, disabled = false) {
  const element = document.createElement('button');
  element.textContent = text;
  element.title = title;
  element.setAttribute('aria-label', title);
  element.disabled = disabled;
  element.addEventListener('click', action);
  return element;
}

function changed() { editVersion++; dirty = true; preview(); }

function targetSelect(value, onChange) {
  const select = document.createElement('select');
  const available = ['end', 'abort', ...nodes.map(node => node.id)];
  if (!available.includes(value)) available.push(value);
  for (const target of available) {
    const option = document.createElement('option');
    option.value = target;
    option.textContent = target || '(missing target)';
    option.selected = target === value;
    select.append(option);
  }
  select.addEventListener('change', () => { onChange(select.value); changed(); });
  return select;
}

function render() {
  nodesElement.replaceChildren();
  nodes.forEach((node, index) => {
    const step = document.createElement('article');
    step.className = 'step';
    const card = document.createElement('div');
    card.className = 'step-card';
    const header = document.createElement('div');
    header.className = 'step-head';
    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.textContent = `Step ${index + 1} · ${node.kind}`;
    const controls = document.createElement('div');
    controls.className = 'controls';
    const move = delta => { [nodes[index], nodes[index + delta]] = [nodes[index + delta], nodes[index]]; changed(); render(); };
    controls.append(
      button('↑', 'Move step up', () => move(-1), index === 0),
      button('↓', 'Move step down', () => move(1), index === nodes.length - 1),
      button('Remove', 'Remove step', () => { nodes.splice(index, 1); changed(); render(); }, nodes.length === 1),
    );
    header.append(badge, controls);
    const id = document.createElement('input');
    id.value = node.id;
    id.maxLength = 64;
    id.addEventListener('input', () => { node.id = id.value; changed(); });
    const type = document.createElement('select');
    for (const [value, name] of Object.entries(types)) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = name;
      option.selected = value === (node.kind === 'function' ? node.function : node.kind);
      type.append(option);
    }
    type.addEventListener('change', () => {
      if (type.value === 'agentic') {
        nodes[index] = { id: node.id, kind: 'agentic', instruction: 'Summarize the inspection findings.', interactive: false };
      } else if (type.value === 'decision') {
        nodes[index] = { id: node.id, kind: 'decision', cases: [{ when: { ref: 'state.answer', op: 'eq', value: 'yes' }, next: 'end' }], default: nodes[index + 1]?.id ?? 'end' };
      } else {
        nodes[index] = { id: node.id, kind: 'function', function: type.value, input: type.value === 'voice_assistant' ? { message: 'What did you observe?' } : {} };
      }
      changed(); render();
    });
    card.append(header, field('Node ID', id), field('Step type', type));
    if (node.function === 'voice_assistant') {
      const message = document.createElement('textarea');
      message.value = node.input.message;
      message.maxLength = 500;
      message.addEventListener('input', () => { node.input.message = message.value; changed(); });
      card.append(field('Question', message));
    }
    if (node.kind === 'agentic') {
      const instruction = document.createElement('textarea');
      instruction.value = node.instruction;
      instruction.maxLength = 500;
      instruction.addEventListener('input', () => { node.instruction = instruction.value; changed(); });
      card.append(field('Agent instruction (non-interactive)', instruction));
    }
    if (node.kind === 'decision') {
      const condition = node.cases[0];
      const reference = document.createElement('input');
      reference.value = condition.when.ref;
      reference.addEventListener('input', () => { condition.when.ref = reference.value; changed(); });
      const operation = document.createElement('select');
      for (const [value, label] of [['eq', 'equals'], ['ne', 'does not equal']]) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = label;
        option.selected = value === condition.when.op;
        operation.append(option);
      }
      operation.addEventListener('change', () => { condition.when.op = operation.value; changed(); });
      const value = document.createElement('input');
      value.value = condition.when.value;
      value.addEventListener('input', () => { condition.when.value = value.value; changed(); });
      card.append(
        field('If reference (state.key or form.key)', reference),
        field('Comparison', operation),
        field('Value (text)', value),
        field('When matched →', targetSelect(condition.next, target => { condition.next = target; })),
        field('Otherwise →', targetSelect(node.default, target => { node.default = target; })),
      );
    }
    step.append(card);
    nodesElement.append(step);
  });
  preview();
}

function fromState(state) {
  revision = state.revision;
  nodes = state.nodes.map(node => {
    const copy = JSON.parse(JSON.stringify(node));
    if (copy.kind !== 'decision') delete copy.next;
    return copy;
  });
  dirty = false;
  render();
}

async function load() {
  const response = await fetch('state');
  if (!response.ok) throw new Error('Could not load the saved diagram.');
  fromState(await response.json());
}

document.querySelector('#add').addEventListener('click', () => {
  if (nodes.length >= 50) { statusElement.textContent = 'The prototype supports at most 50 steps.'; return; }
  let number = nodes.length + 1;
  while (nodes.some(node => node.id === `step-${number}`)) number++;
  nodes.push({ id: `step-${number}`, kind: 'function', function: 'voice_assistant', input: { message: 'What did you observe?' } });
  changed(); render();
});
document.querySelector('#save').addEventListener('click', async () => {
  const savedVersion = editVersion;
  try {
    const response = await fetch('state', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ revision, nodes: editableNodes() }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not save the diagram.');
    if (editVersion === savedVersion) {
      fromState(result);
    } else {
      revision = result.revision;
      statusElement.textContent = 'Earlier changes saved; newer edits are still unsaved.';
    }
  } catch (error) { statusElement.textContent = error.message; }
});
document.querySelector('#reload').addEventListener('click', async () => {
  if (dirty && !window.confirm('Discard unsaved diagram changes?')) return;
  try { await load(); } catch (error) { statusElement.textContent = error.message; }
});
document.querySelector('#copy').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(JSON.stringify(graph(), null, 2));
    statusElement.textContent = 'Graph copied.';
  } catch { statusElement.textContent = 'Could not copy. Select the graph text to copy it.'; }
});
load().catch(error => { statusElement.textContent = error.message; });
