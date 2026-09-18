const MANUAL_COMMANDS_PATH = './commands/';
const SHARED_SOLUTION_SKILL_PATH =
  '${CLAUDE_PLUGIN_ROOT}/skills/fulcrum-solution-document/SKILL.md';

export function validateClaudeManualCommand(manifest, frontmatter, body, relativePath) {
  const failures = [];

  if (manifest?.commands !== MANUAL_COMMANDS_PATH) {
    failures.push(`${relativePath}: commands must point to ${MANUAL_COMMANDS_PATH}`);
  }

  if (frontmatter?.['disable-model-invocation'] !== true) {
    failures.push(`${relativePath}: disable-model-invocation must be true`);
  }

  if (typeof body !== 'string' || !body.includes(SHARED_SOLUTION_SKILL_PATH)) {
    failures.push(`${relativePath}: must delegate to the shared solution-document skill`);
  }

  return failures;
}
