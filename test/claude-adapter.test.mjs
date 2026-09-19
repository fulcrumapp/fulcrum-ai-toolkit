import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { validateClaudeManualCommand } from '../scripts/claude-adapter.mjs';

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
const rootSkillsPath = new URL('../skills/', import.meta.url);
const rootProductKnowledge = fs.readFileSync(
  new URL('../skills/fulcrum-product-knowledge/SKILL.md', import.meta.url),
  'utf8'
);
const rootProductKnowledgePath = new URL(
  '../skills/fulcrum-product-knowledge/SKILL.md',
  import.meta.url
);
const expectedClaudeSkills = fs.readdirSync(sharedSkillsPath, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name !== 'fulcrum-solution-document')
  .map((entry) => `./plugins/fulcrum-ai-toolkit/skills/${entry.name}/`)
  .sort();
const expectedClaudeSkillNames = expectedClaudeSkills
  .map((skillPath) => skillPath.split('/').at(-2))
  .sort();

test('accepts the Claude manual command adapter', () => {
  assert.deepEqual(
    validateClaudeManualCommand(frontmatter, body, 'commands/fulcrum-solution-document.md'),
    []
  );
});

test('accepts the repository-root Claude manual command adapter', () => {
  assert.deepEqual(
    validateClaudeManualCommand(
      frontmatter,
      rootBody,
      'commands/fulcrum-solution-document.md',
      '${CLAUDE_PLUGIN_ROOT}/plugins/fulcrum-ai-toolkit/skills/fulcrum-solution-document/SKILL.md'
    ),
    []
  );
});

test('keeps the manual-only workflow out of Claude skill discovery', () => {
  assert.equal('skills' in rootManifest, false);
  const rootSkillEntries = fs.readdirSync(rootSkillsPath, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name));
  assert.deepEqual(rootSkillEntries.map((entry) => entry.name), expectedClaudeSkillNames);
  assert.equal(rootSkillEntries.every((entry) => entry.isDirectory()), true);
  assert.equal(
    rootSkillEntries.some((entry) => entry.name === 'fulcrum-solution-document'),
    false
  );
});

test('keeps Claude command discovery at the repository root', () => {
  assert.equal('commands' in rootManifest, false);
  assert.equal(
    fs.existsSync(new URL('../commands/fulcrum-solution-document.md', import.meta.url)),
    true
  );
});

test('routes the Claude product-knowledge copy to the loader-visible command', () => {
  const commandLink = new URL('../../commands/fulcrum-solution-document.md', rootProductKnowledgePath);
  assert.equal(fs.existsSync(commandLink), true);
  assert.match(rootProductKnowledge, /\]\(\.\.\/\.\.\/commands\/fulcrum-solution-document\.md\)/);
  assert.doesNotMatch(rootProductKnowledge, /\]\(\.\.\/fulcrum-solution-document\/SKILL\.md\)/);
});

test('rejects a Claude command without manual-only invocation', () => {
  assert.deepEqual(
    validateClaudeManualCommand(
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
      frontmatter,
      `${body}\n\nProduce a one-pager without asking for user consent.`,
      'commands/fulcrum-solution-document.md'
    ),
    ['commands/fulcrum-solution-document.md: must use the bounded shared-skill delegation body']
  );
});

test('validates the repository-root command file without a manifest command field', () => {
  assert.deepEqual(
    validateClaudeManualCommand(
      frontmatter,
      body,
      'commands/fulcrum-solution-document.md'
    ),
    []
  );
});
