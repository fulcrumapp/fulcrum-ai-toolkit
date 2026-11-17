export const initialNodes = [
  { id: 'bike-photo', kind: 'function', function: 'photo_analyze_tool', input: {} },
  { id: 'brakes', kind: 'function', function: 'voice_assistant', input: { message: 'Are the brakes working properly?' } },
  { id: 'tires', kind: 'function', function: 'voice_assistant', input: { message: 'Are the tires in good condition?' } },
  { id: 'lights', kind: 'function', function: 'voice_assistant', input: { message: 'Are the lights working?' } },
];

export function withDuplicateCheck(nodes) {
  const inspection = buildGraph(nodes).nodes;
  const prefix = [
    { id: 'ask-bike-number', kind: 'function', function: 'voice_assistant',
      input: { message: 'What is the bicycle number? Please check it carefully.' },
      assign: { answer: '{{result.answer}}' }, next: 'prepare-bike-number', on_error: 'lookup-failed' },
    { id: 'prepare-bike-number', kind: 'function', function: 'js',
      input: { expression: "({ bike_number: String(state.answer || '').trim(), date_shaped: /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(String(state.answer || '').trim()) })" },
      next: 'check-bike-number', on_error: 'lookup-failed' },
    { id: 'check-bike-number', kind: 'decision', cases: [
      { when: { ref: 'state.bike_number', op: 'eq', value: '' }, next: 'lookup-failed' },
      { when: { ref: 'state.date_shaped', op: 'eq', value: true }, next: 'lookup-failed' },
    ], default: 'search-inspections' },
    { id: 'search-inspections', kind: 'function', function: 'record_search_tool',
      input: { app_id: 'VERIFIED_APP_UUID', exact_field: 'VERIFIED_STORED_BIKE_FIELD_KEY', exact_value: '{{state.bike_number}}', limit: 1 },
      assign: { candidate_count: '{{result.match_count}}' }, next: 'check-lookup-result', on_error: 'lookup-failed' },
    { id: 'check-lookup-result', kind: 'decision', cases: [
      { when: { ref: 'state.candidate_count', op: 'gt', value: 0 }, next: 'possible-match' },
      { when: { ref: 'state.candidate_count', op: 'eq', value: 0 }, next: 'no-local-match' },
    ], default: 'lookup-failed' },
    { id: 'possible-match', kind: 'function', function: 'voice_assistant',
      input: { message: 'A possible match was found. Check the bicycle number and existing records manually.', listen: false } },
    { id: 'no-local-match', kind: 'function', function: 'voice_assistant',
      input: { message: 'No local match was found. This does not guarantee the number is unique.', listen: false },
      next: inspection[0].id, on_error: 'lookup-failed' },
    { id: 'lookup-failed', kind: 'function', function: 'voice_assistant',
      input: { message: 'The bicycle number could not be checked. Please check existing records manually.', listen: false } },
  ];
  const reserved = new Set(prefix.map(node => node.id));
  const collision = inspection.find(node => reserved.has(node.id));
  if (collision) throw new Error(`Node ID ${collision.id} is reserved for the bicycle lookup.`);
  return { schema_version: 1, nodes: [...prefix, ...inspection] };
}

export function branchView(nodes, { compactLookup = false } = {}) {
  const byId = new Map(nodes.map(node => [node.id, node]));
  const visited = new Set();
  const lookupFunctions = new Set(['ask-bike-number', 'prepare-bike-number', 'search-inspections', 'no-local-match']);
  function visit(id) {
    if (id === 'end' || id === 'abort') return { type: 'terminal', id };
    const node = byId.get(id);
    if (!node) return { type: 'missing', id };
    if (visited.has(id)) return { type: 'reference', id };
    visited.add(id);
    if (compactLookup && id === 'prepare-bike-number') return visit(node.next ?? 'end');
    if (compactLookup && id === 'check-bike-number') return visit(node.default);
    let children;
    if (compactLookup && id === 'check-lookup-result') {
      children = [
        { label: 'Possible match', target: node.cases[0].next },
        { label: 'No local match', target: node.cases[1].next },
      ];
    } else if (compactLookup && lookupFunctions.has(id)) {
      children = [{ label: '', target: node.next ?? 'end' }];
    } else {
      children = node.kind === 'decision' ? [
          ...node.cases.map((branch, index) => ({ label: node.cases.length === 1 ? 'When matched' : `Case ${index + 1}`, target: branch.next })),
          { label: 'Otherwise', target: node.default },
        ]
      : [
          { label: node.on_error ? 'Success' : '', target: node.next ?? 'end' },
          ...(node.on_error ? [{ label: 'Error', target: node.on_error }] : []),
        ];
    }
    return {
      type: 'node',
      node,
      children: children.map(child => ({ label: child.label, view: visit(child.target) })),
    };
  }
  return nodes.length ? visit(nodes[0].id) : null;
}

export function buildGraph(nodes) {
  if (!Array.isArray(nodes) || nodes.length < 1 || nodes.length > 50) throw new Error('A diagram needs 1–50 nodes.');
  const ids = new Set();
  const cleaned = nodes.map(node => {
    if (!node || typeof node !== 'object' || Array.isArray(node)) throw new Error('Each node must be an object.');
    if (typeof node.id !== 'string' || !/^[a-z][a-z0-9-]{0,63}$/.test(node.id) || ['end', 'abort'].includes(node.id) || ids.has(node.id)) throw new Error(`Invalid or duplicate node ID: ${node.id}`);
    ids.add(node.id);
    if (node.kind === 'agentic') {
      if (Object.keys(node).some(key => !['id', 'kind', 'instruction', 'interactive', 'next'].includes(key))) throw new Error('Unsupported agentic setting.');
      if (typeof node.instruction !== 'string' || !node.instruction.trim() || node.instruction.length > 500) throw new Error(`Enter an agent instruction for ${node.id} (up to 500 characters).`);
      if (node.interactive !== false) throw new Error('The prototype supports non-interactive agents only.');
      return { id: node.id, kind: 'agentic', instruction: node.instruction, interactive: false };
    }
    if (node.kind === 'decision') {
      if (Object.keys(node).some(key => !['id', 'kind', 'cases', 'default'].includes(key))) throw new Error('Unsupported decision setting.');
      if (!Array.isArray(node.cases) || node.cases.length !== 1) throw new Error('The prototype supports one decision condition.');
      const branch = node.cases[0];
      if (!branch || Object.keys(branch).some(key => !['when', 'next'].includes(key)) || !branch.when || Object.keys(branch.when).some(key => !['ref', 'op', 'value'].includes(key))) throw new Error('Invalid decision condition.');
      if (!/^(state|form)\.[^\s{}]+$/.test(branch.when.ref) || !['eq', 'ne'].includes(branch.when.op) || typeof branch.when.value !== 'string') throw new Error(`Invalid condition for ${node.id}.`);
      if (typeof branch.next !== 'string' || typeof node.default !== 'string') throw new Error('Decision branches need targets.');
      return { id: node.id, kind: 'decision', cases: [{ when: { ...branch.when }, next: branch.next }], default: node.default };
    }
    if (Object.keys(node).some(key => !['id', 'kind', 'function', 'input', 'next'].includes(key))) throw new Error('Unsupported function setting.');
    if (node.kind !== 'function' || !['voice_assistant', 'photo_analyze_tool', 'editor_read'].includes(node.function)) throw new Error('Unsupported node type.');
    if (!node.input || typeof node.input !== 'object' || Array.isArray(node.input)) throw new Error('Each node needs an input object.');
    if (node.function === 'voice_assistant') {
      if (Object.keys(node.input).some(key => key !== 'message') || typeof node.input.message !== 'string' || !node.input.message.trim() || node.input.message.length > 500) throw new Error(`Enter a voice question for ${node.id} (up to 500 characters).`);
      return { id: node.id, kind: 'function', function: node.function, input: { message: node.input.message } };
    }
    if (Object.keys(node.input).length) throw new Error(`Unexpected input for ${node.id}.`);
    return { id: node.id, kind: 'function', function: node.function, input: {} };
  });
  cleaned.forEach((node, index) => {
    if (node.kind !== 'decision' && index + 1 < cleaned.length) node.next = cleaned[index + 1].id;
    if (node.kind !== 'decision' && nodes[index].next !== undefined && nodes[index].next !== (cleaned[index + 1]?.id ?? 'end')) throw new Error('Executable steps must follow their display order.');
  });
  const targets = node => node.kind === 'decision' ? [node.cases[0].next, node.default] : [node.next ?? 'end'];
  for (const node of cleaned) for (const target of targets(node)) {
    if (!ids.has(target) && target !== 'end' && target !== 'abort') throw new Error(`Node ${node.id} points to a missing target: ${target}`);
  }
  const byId = new Map(cleaned.map(node => [node.id, node]));
  const seen = new Set();
  const pending = [cleaned[0].id];
  while (pending.length) {
    const id = pending.pop();
    if (seen.has(id) || !byId.has(id)) continue;
    seen.add(id);
    pending.push(...targets(byId.get(id)));
  }
  const unreachable = cleaned.find(node => !seen.has(node.id));
  if (unreachable) throw new Error(`Node ${unreachable.id} is unreachable. Adjust decision targets.`);
  return { schema_version: 1, nodes: cleaned };
}
