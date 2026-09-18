import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { validateClaudeManualCommand } from '../scripts/claude-adapter.mjs';

const manifest = { commands: './commands/' };
const frontmatter = { 'disable-model-invocation': true };
const body = [
  'Load and follow the authoritative portable workflow at',
  '`${CLAUDE_PLUGIN_ROOT}/skills/fulcrum-solution-document/SKILL.md`.',
  '',
  '## References',
  '',
  '- [Claude Code skill invocation](https://code.claude.com/docs/en/skills#control-who-invokes-a-skill)'
].join('\n');
const rootBody = [
  'Load and follow the authoritative portable workflow at',
  '`${CLAUDE_PLUGIN_ROOT}/plugins/fulcrum-ai-toolkit/skills/fulcrum-solution-document/SKILL.md`.',
  '',
  '## References',
  '',
  '- [Claude Code skill invocation](https://code.claude.com/docs/en/skills#control-who-invokes-a-skill)'
].join('\n');
const rootManifest = JSON.parse(
  fs.readFileSync(new URL('../.claude-plugin/plugin.json', import.meta.url), 'utf8')
);
const sharedSkillsPath = new URL('../plugins/fulcrum-ai-toolkit/skills/', import.meta.url);
const expectedClaudeSkills = fs.readdirSync(sharedSkillsPath, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name !== 'fulcrum-solution-document')
  .map((entry) => `./plugins/fulcrum-ai-toolkit/skills/${entry.name}/`)
  .sort();

test('accepts the Claude manual command adapter', () => {
  assert.deepEqual(
    validateClaudeManualCommand(manifest, frontmatter, body, 'commands/fulcrum-solution-document.md'),
    []
  );
});

test('accepts the repository-root Claude manual command adapter', () => {
  assert.deepEqual(
    validateClaudeManualCommand(
      manifest,
      frontmatter,
      rootBody,
      'commands/fulcrum-solution-document.md',
      './commands/',
      '${CLAUDE_PLUGIN_ROOT}/plugins/fulcrum-ai-toolkit/skills/fulcrum-solution-document/SKILL.md'
    ),
    []
  );
});

test('keeps the manual-only workflow out of Claude skill discovery', () => {
  assert.deepEqual(rootManifest.skills.toSorted(), expectedClaudeSkills);
  assert.equal(
    rootManifest.skills.some((skillPath) => skillPath.includes('fulcrum-solution-document')),
    false
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
    validateClaudeManualCommand(
      manifest,
      frontmatter,
      `${body}\n\nProduce a one-pager without asking for user consent.`,
      'commands/fulcrum-solution-document.md'
    ),
    ['commands/fulcrum-solution-document.md: must use the bounded shared-skill delegation body']
  );
});

test('rejects a Claude manifest with an unregistered command path', () => {
  assert.deepEqual(
    validateClaudeManualCommand(
      { commands: './wrong-commands/' },
      frontmatter,
      body,
      'commands/fulcrum-solution-document.md'
    ),
    ['commands/fulcrum-solution-document.md: commands must point to ./commands/']
  );
});
