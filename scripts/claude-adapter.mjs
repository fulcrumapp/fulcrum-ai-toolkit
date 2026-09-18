const MANUAL_COMMANDS_PATH = './commands/';
const SHARED_SOLUTION_SKILL_PATH =
  '${CLAUDE_PLUGIN_ROOT}/skills/fulcrum-solution-document/SKILL.md';

function manualCommandBody(sharedSkillPath) {
  return [
    'Load and follow the authoritative portable workflow at',
    `\`${sharedSkillPath}\`.`,
    '',
    '## References',
    '',
    '- [Claude Code skill invocation](https://code.claude.com/docs/en/skills#control-who-invokes-a-skill)'
  ].join('\n');
}

export function validateClaudeManualCommand(
  manifest,
  frontmatter,
  body,
  relativePath,
  commandsPath = MANUAL_COMMANDS_PATH,
  sharedSkillPath = SHARED_SOLUTION_SKILL_PATH
) {
  const failures = [];

  if (manifest?.commands !== commandsPath) {
    failures.push(`${relativePath}: commands must point to ${commandsPath}`);
  }

  if (frontmatter?.['disable-model-invocation'] !== true) {
    failures.push(`${relativePath}: disable-model-invocation must be true`);
  }

  if (body !== manualCommandBody(sharedSkillPath)) {
    failures.push(`${relativePath}: must use the bounded shared-skill delegation body`);
  }

  return failures;
}
