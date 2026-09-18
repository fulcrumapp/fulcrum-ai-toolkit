import assert from 'node:assert/strict';
import test from 'node:test';
import { validateForbiddenPackagePaths } from '../scripts/package-invariants.mjs';

const forbiddenPaths = [
  'plugins/example/.cursor-plugin/plugin.json',
  'plugins/example/.codex-plugin/plugin.json',
  'plugins/example/.mcp.json'
];

test('accepts a package without forbidden vendor-specific files', () => {
  assert.deepEqual(validateForbiddenPackagePaths(forbiddenPaths, () => false), []);
});

test('rejects restored forbidden vendor-specific files', () => {
  const present = new Set([forbiddenPaths[0], forbiddenPaths[2]]);
  const failures = validateForbiddenPackagePaths(forbiddenPaths, (relativePath) => present.has(relativePath));

  assert.deepEqual(failures, [
    'plugins/example/.cursor-plugin/plugin.json: redundant vendor-specific file must not be present',
    'plugins/example/.mcp.json: redundant vendor-specific file must not be present'
  ]);
});
