import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const validatorPath = path.join(repoRoot, 'scripts', 'validate-skill-version-bumps.mjs');
const skillPath = 'plugins/fulcrum-ai-toolkit/skills/example-skill/SKILL.md';
const resourcePath = 'plugins/fulcrum-ai-toolkit/skills/example-skill/resources/example.md';

function skillContent(version) {
  const metadata = version === null ? '' : `metadata:\n  version: "${version}"\n`;
  return `---\nname: example-skill\n${metadata}description: Example skill for tests\n---\n\n# Example\n`;
}

function addSkill(root, name, version) {
  const skillFile = path.join(root, 'plugins/fulcrum-ai-toolkit/skills', name, 'SKILL.md');
  fs.mkdirSync(path.dirname(skillFile), { recursive: true });
  fs.writeFileSync(skillFile, skillContent(version).replace('example-skill', name), 'utf8');
}

function createRepository(t, baseVersion, baseSkillPath = skillPath, baseResourcePath = resourcePath) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-versioning-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  runGit(root, ['init', '-b', 'main']);
  runGit(root, ['config', 'user.name', 'Skill Version Test']);
  runGit(root, ['config', 'user.email', 'skill-version-test@example.invalid']);

  const skillFile = path.join(root, baseSkillPath);
  fs.mkdirSync(path.dirname(skillFile), { recursive: true });
  fs.writeFileSync(skillFile, skillContent(baseVersion), 'utf8');

  const resourceFile = path.join(root, baseResourcePath);
  fs.mkdirSync(path.dirname(resourceFile), { recursive: true });
  fs.writeFileSync(resourceFile, 'Initial resource\n', 'utf8');

  runGit(root, ['add', '.']);
  runGit(root, ['commit', '-m', 'Create example skill']);
  runGit(root, ['checkout', '-b', 'skill-changes']);
  return { root, skillFile, resourceFile };
}

function runGit(cwd, args) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
}

function runValidator(root) {
  return spawnSync(process.execPath, [validatorPath], {
    cwd: root,
    env: {
      ...process.env,
      FULCRUM_SKILL_VERSION_BASE: 'main',
      FULCRUM_SKILL_VERSION_ROOT: root
    },
    encoding: 'utf8'
  });
}

test('requires a version increase for changes to supporting files', (t) => {
  const { root, skillFile, resourceFile } = createRepository(t, '1.0.0');
  fs.writeFileSync(resourceFile, 'Updated resource\n', 'utf8');
  runGit(root, ['add', '.']);
  runGit(root, ['commit', '-m', 'Change supporting resource']);

  const unchangedVersion = runValidator(root);
  assert.equal(unchangedVersion.status, 1);
  assert.match(unchangedVersion.stderr, /version must increase above 1\.0\.0/);

  fs.writeFileSync(skillFile, skillContent('1.1.0'), 'utf8');
  runGit(root, ['add', '.']);
  runGit(root, ['commit', '-m', 'Bump skill version']);
  const increasedVersion = runValidator(root);
  assert.equal(increasedVersion.status, 0, increasedVersion.stderr);
});

test('accepts existing unversioned skills as a one-time migration baseline', (t) => {
  const { root, resourceFile } = createRepository(t, null);
  fs.writeFileSync(resourceFile, 'Updated resource\n', 'utf8');
  fs.writeFileSync(path.join(root, skillPath), skillContent('1.0.0'), 'utf8');
  runGit(root, ['add', '.']);
  runGit(root, ['commit', '-m', 'Initialize skill version']);

  const result = runValidator(root);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /unversioned base skill\(s\) initialized/);
});

test('accepts a new skill with an initial version', (t) => {
  const { root } = createRepository(t, null);
  addSkill(root, 'new-skill', '1.0.0');
  runGit(root, ['add', '.']);
  runGit(root, ['commit', '-m', 'Add new skill']);

  const result = runValidator(root);
  assert.equal(result.status, 0, result.stderr);
});

test('rejects a new skill that does not start at version 1.0.0', (t) => {
  const { root } = createRepository(t, null);
  addSkill(root, 'new-skill', '1.0.1');
  runGit(root, ['add', '.']);
  runGit(root, ['commit', '-m', 'Add new skill']);

  const result = runValidator(root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /new skills must start at 1\.0\.0; found 1\.0\.1/);
});

test('preserves a moved skill version but rejects resetting it', (t) => {
  const oldSkillPath = 'plugins/legacy-toolkit/skills/example-skill/SKILL.md';
  const oldResourcePath = 'plugins/legacy-toolkit/skills/example-skill/resources/example.md';
  const { root, skillFile, resourceFile } = createRepository(
    t,
    '1.2.0',
    oldSkillPath,
    oldResourcePath
  );
  const movedSkillFile = path.join(root, skillPath);
  const movedResourceFile = path.join(root, resourcePath);
  fs.mkdirSync(path.dirname(movedResourceFile), { recursive: true });
  fs.renameSync(skillFile, movedSkillFile);
  fs.renameSync(resourceFile, movedResourceFile);
  runGit(root, ['add', '-A']);
  runGit(root, ['commit', '-m', 'Move existing skill']);

  const preservedVersion = runValidator(root);
  assert.equal(preservedVersion.status, 0, preservedVersion.stderr);

  fs.writeFileSync(movedSkillFile, skillContent('1.0.0'), 'utf8');
  runGit(root, ['add', '.']);
  runGit(root, ['commit', '-m', 'Reset moved skill version']);

  const resetVersion = runValidator(root);
  assert.equal(resetVersion.status, 1);
  assert.match(resetVersion.stderr, /version must increase above 1\.2\.0; found 1\.0\.0/);

  fs.writeFileSync(movedSkillFile, skillContent('1.2.1'), 'utf8');
  runGit(root, ['add', '.']);
  runGit(root, ['commit', '-m', 'Increment moved skill version']);

  const increasedVersion = runValidator(root);
  assert.equal(increasedVersion.status, 0, increasedVersion.stderr);
});

test('rejects an invalid base version instead of treating it as a migration', (t) => {
  const { root, skillFile, resourceFile } = createRepository(t, 'v1.0.0');
  fs.writeFileSync(resourceFile, 'Updated resource\n', 'utf8');
  fs.writeFileSync(skillFile, skillContent('1.1.0'), 'utf8');
  runGit(root, ['add', '.']);
  runGit(root, ['commit', '-m', 'Change skill with invalid prior version']);

  const result = runValidator(root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /base metadata\.version is not stable SemVer/);
});
