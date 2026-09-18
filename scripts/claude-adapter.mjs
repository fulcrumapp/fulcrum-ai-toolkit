const MANUAL_COMMANDS_PATH = './commands/';
const SHARED_SOLUTION_SKILL_PATH =
  '${CLAUDE_PLUGIN_ROOT}/skills/fulcrum-solution-document/SKILL.md';
const MANUAL_COMMAND_BODY = [
  'Load and follow the authoritative portable workflow at',
  `\`${SHARED_SOLUTION_SKILL_PATH}\`.`,
  '',
  '## References',
  '',
  '- [Claude Code skill invocation](https://code.claude.com/docs/en/skills#control-who-invokes-a-skill)'
].join('\n');

export function validateClaudeManualCommand(
  manifest,
  frontmatter,
  body,
  relativePath,
  commandsPath = MANUAL_COMMANDS_PATH
) {
  const failures = [];

  if (manifest?.commands !== commandsPath) {
    failures.push(`${relativePath}: commands must point to ${commandsPath}`);
  }

  if (frontmatter?.['disable-model-invocation'] !== true) {
    failures.push(`${relativePath}: disable-model-invocation must be true`);
  }

  if (body !== MANUAL_COMMAND_BODY) {
    failures.push(`${relativePath}: must use the bounded shared-skill delegation body`);
  }

  return failures;
}
