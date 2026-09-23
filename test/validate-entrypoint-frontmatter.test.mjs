import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..');
const fixturesRoot = path.join(repoRoot, 'test', 'fixtures', 'entrypoint-frontmatter');

function fixture(name) {
  return fs.readFileSync(path.join(fixturesRoot, name), 'utf8');
}

function runValidatorWithEntrypoints(rootEntrypoint, packageEntrypoint) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'entrypoint-frontmatter-'));
  const rootPath = path.join(tempDir, 'root-SKILL.md');
  const packagePath = path.join(tempDir, 'package-SKILL.md');
  fs.writeFileSync(rootPath, rootEntrypoint, 'utf8');
  fs.writeFileSync(packagePath, packageEntrypoint, 'utf8');

  const result = spawnSync(process.execPath, ['scripts/validate.mjs'], {
    cwd: repoRoot,
    env: {
      ...process.env,
      FULCRUM_VALIDATE_BUNDLE_ENTRYPOINTS: `${rootPath}${path.delimiter}${packagePath}`
    },
    encoding: 'utf8'
  });

  fs.rmSync(tempDir, { recursive: true, force: true });
  return result;
}

test('bundle entrypoint checks pass for valid frontmatter', () => {
  const result = runValidatorWithEntrypoints(
    fixture('valid-entrypoint.md'),
    fixture('valid-entrypoint.md')
  );
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Validation passed:/);
});

const malformedCases = [
  {
    name: 'rejects unanchored delimiter with preamble text',
    fixture: 'unanchored-delimiter.md',
    expected: /missing YAML frontmatter/
  },
  {
    name: 'rejects invalid YAML',
    fixture: 'invalid-yaml.md',
    expected: /invalid YAML frontmatter/
  },
  {
    name: 'rejects array name value',
    fixture: 'name-array.md',
    expected: /frontmatter needs name and description/
  },
  {
    name: 'rejects object description value',
    fixture: 'description-object.md',
    expected: /frontmatter needs name and description/
  },
  {
    name: 'rejects whitespace-only name',
    fixture: 'name-whitespace.md',
    expected: /frontmatter needs name and description/
  },
  {
    name: 'rejects whitespace-only description',
    fixture: 'description-whitespace.md',
    expected: /frontmatter needs name and description/
  },
  {
    name: 'rejects invalid name format',
    fixture: 'name-invalid-format.md',
    expected: /frontmatter needs name and description/
  },
  {
    name: 'rejects descriptions longer than 1024 characters',
    fixture: 'description-too-long.md',
    expected: /frontmatter needs name and description/
  }
];

for (const malformed of malformedCases) {
  test(`bundle entrypoint checks ${malformed.name}`, () => {
    const result = runValidatorWithEntrypoints(
      fixture(malformed.fixture),
      fixture('valid-entrypoint.md')
    );
    assert.equal(result.status, 1, result.stdout);
    assert.match(result.stderr, malformed.expected);
  });
}
