import assert from 'node:assert/strict';
import test from 'node:test';
import { validateForbiddenPackagePaths } from '../scripts/package-invariants.mjs';

const forbiddenPaths = [
  'plugins/example/.cursor-plugin/plugin.json',
  'plugins/example/.codex-plugin/plugin.json',
  'plugins/example/.mcp.json',
  'plugins/example/.claude-plugin/plugin.json',
  'plugins/example/commands/fulcrum-solution-document.md',
  'plugins/example/gemini-extension.json'
];

test('accepts a package without forbidden vendor-specific files', () => {
  assert.deepEqual(validateForbiddenPackagePaths(forbiddenPaths, () => false), []);
});

test('rejects restored forbidden vendor-specific files', () => {
  const present = new Set(forbiddenPaths);
  const failures = validateForbiddenPackagePaths(forbiddenPaths, (relativePath) => present.has(relativePath));

  assert.deepEqual(failures, forbiddenPaths.map(
    (relativePath) => `${relativePath}: redundant vendor-specific file must not be present`
  ));
});
