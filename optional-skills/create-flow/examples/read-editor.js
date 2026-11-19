// Proposed new-record example; requires verified ask_user and editor_read hosts.
// Integrate with the existing form script only after review and approval.
ON('new-record', function () {
  FLOW({
    schema_version: 1,
    nodes: [
      {
        id: 'confirm-read',
        kind: 'function',
        function: 'ask_user',
        input: {
          kind: 'confirmation',
          question: 'Read the open record without changing it?',
        },
        assign: { read_confirmed: '{{result.confirmed}}' },
        next: 'read-approved',
      },
      {
        id: 'read-approved',
        kind: 'decision',
        cases: [
          {
            when: { ref: 'state.read_confirmed', op: 'eq', value: true },
            next: 'read-editor',
          },
          {
            when: { ref: 'state.read_confirmed', op: 'eq', value: false },
            next: 'end',
          },
        ],
        default: 'abort',
      },
      {
        id: 'read-editor',
        kind: 'function',
        function: 'editor_read',
        input: {},
        next: 'read-complete',
      },
      {
        id: 'read-complete',
        kind: 'function',
        function: 'ask_user',
        input: {
          kind: 'alert',
          question: 'The editor read completed. This FLOW made no changes.',
        },
        next: 'end',
      },
    ],
  });
});
