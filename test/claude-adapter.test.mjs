import assert from 'node:assert/strict';
import test from 'node:test';
import { validateClaudeManualCommand } from '../scripts/claude-adapter.mjs';

const manifest = { commands: './commands/' };
const frontmatter = { 'disable-model-invocation': true };
const body = 'Load `${CLAUDE_PLUGIN_ROOT}/skills/fulcrum-solution-document/SKILL.md`.';

test('accepts the Claude manual command adapter', () => {
  assert.deepEqual(
    validateClaudeManualCommand(manifest, frontmatter, body, 'commands/fulcrum-solution-document.md'),
    []
  );
});

test('rejects a Claude command without manual-only invocation', () => {
  assert.deepEqual(
    validateClaudeManualCommand(
      manifest,
      { 'disable-model-invocation': false },
      body,
      'commands/fulcrum-solution-document.md'
    ),
    ['commands/fulcrum-solution-document.md: disable-model-invocation must be true']
  );
});

test('rejects a Claude command that copies or replaces the shared workflow', () => {
  assert.deepEqual(
    validateClaudeManualCommand(manifest, frontmatter, 'Run the workflow here.', 'commands/fulcrum-solution-document.md'),
    ['commands/fulcrum-solution-document.md: must delegate to the shared solution-document skill']
  );
});
