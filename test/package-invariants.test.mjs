import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  pathEntryExists,
  validateForbiddenPackagePaths
} from '../scripts/package-invariants.mjs';

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

test('detects dangling symlinks as present path entries', () => {
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'package-invariants-'));
  const danglingSymlink = path.join(temporaryDirectory, 'forbidden-link');

  try {
    fs.symlinkSync(path.join(temporaryDirectory, 'missing-target'), danglingSymlink);

    assert.equal(pathEntryExists(danglingSymlink), true);
  } finally {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
});
