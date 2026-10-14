import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const examples = [
  new URL(
    '../plugins/fulcrum-ai-toolkit/skills/fulcrum-data-events/examples/comment-summary-audit-trail.js',
    import.meta.url
  ),
  new URL(
    '../skills/fulcrum-data-events/examples/comment-summary-audit-trail.js',
    import.meta.url
  )
];

for (const [index, examplePath] of examples.entries()) {
  test(`comment summary example ${index + 1} preserves complete history`, () => {
    const callbacks = new Map();
    const existing = 'Earlier comment\n'.repeat(80);
    const comment = 'x'.repeat(2100);
    const user = 'Field Technician';
    const timestamp = '2026-10-14T14:00:00Z';
    const entry = `${user} at ${timestamp} : ${comment}`;
    let result;

    vm.runInNewContext(fs.readFileSync(examplePath, 'utf8'), {
      ON: (eventName, callback) => callbacks.set(eventName, callback),
      USERFULLNAME: () => user,
      TIMESTAMP: () => timestamp,
      CONCAT: (...parts) => parts.join(''),
      SETVALUE: (fieldName, value) => {
        if (fieldName === 'comment_summary') result = value;
      },
      $additional_comments: comment,
      $comment_summary: existing
    });

    callbacks.get('save-record')({});

    assert.equal(result, `${existing}${entry}\n`);
    assert.ok(result.length > 2000);
  });
}
