import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { bumpPluginVersion, releaseToolkit, VERSION_FILES } from '../scripts/release-toolkit.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = VERSION_FILES[0];

function hasCommand(command) {
  try {
    execFileSync(command, ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

const hasUnzip = hasCommand('unzip');

function git(root, ...args) {
  const gitDir = root.endsWith('.git') ? ['--git-dir', root] : [];
  return execFileSync('git', [...gitDir, ...args], {
    cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']
  }).trim();
}

function write(root, relativePath, contents) {
  const target = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, contents);
}

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'toolkit-release-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const origin = path.join(root, 'origin.git');
  const author = path.join(root, 'author');
  const checkout = path.join(root, 'checkout');
  git(root, 'init', '--bare', '--initial-branch=main', origin);
  git(root, 'clone', origin, author);
  git(author, 'config', 'user.name', 'Release Test');
  git(author, 'config', 'user.email', 'release-test@example.invalid');
  for (const relativePath of VERSION_FILES) {
    write(author, relativePath, fs.readFileSync(path.join(repoRoot, relativePath), 'utf8')
      .replace(/("version"\s*:\s*")[^"]*(")/g, (_, before, after) => `${before}0.1.3${after}`));
  }
  write(author, '.gitignore', '.m365-bundle-stage/\nfulcrum-ai-toolkit-m365.zip\n');
  write(author, 'plugins/fulcrum-ai-toolkit/SKILL.md', '# Fixture toolkit\n');
  write(author, 'plugins/fulcrum-ai-toolkit/LICENSE', 'Fixture license\n');
  write(author, 'plugins/fulcrum-ai-toolkit/skills/example/SKILL.md',
    '---\nname: example\nmetadata:\n  version: "1.2.3"\n---\n# Example\n');
  write(author, 'scripts/build-m365-bundle.mjs',
    fs.readFileSync(path.join(repoRoot, 'scripts/build-m365-bundle.mjs'), 'utf8'));
  git(author, 'add', '.');
  git(author, 'commit', '-m', 'Existing toolkit');
  git(author, 'checkout', '-b', 'automation');
  write(author, 'scripts/release-toolkit.mjs', '// Automation introduction fixture\n');
  git(author, 'add', '.');
  git(author, 'commit', '-m', 'Implement release automation');
  git(author, 'checkout', 'main');
  git(author, 'merge', '--no-ff', 'automation', '-m', 'Merge release automation');
  const introduction = git(author, 'rev-parse', 'HEAD');
  git(author, 'push', 'origin', 'main');
  git(root, 'clone', origin, checkout);
  const releases = new Map();
  const calls = [];
  const github = (args) => {
    calls.push(args);
    if (args[0] === 'api') return JSON.stringify([[...releases.values()]]);
    const [, action, tag] = args;
    if (action === 'create') {
      assert.equal(releases.has(tag), false);
      assert.ok(args.includes('--verify-tag'));
      assert.ok(args.includes('--draft'));
      releases.set(tag, { tag_name: tag, draft: true, assets: [] });
    } else if (action === 'upload') {
      assert.equal(git(checkout, 'rev-parse', 'HEAD'), git(origin, 'rev-parse', `${tag}^{commit}`));
      if (hasUnzip) {
        const entries = execFileSync('unzip', ['-l', args[3]], { encoding: 'utf8' });
        assert.match(entries, /SKILL\.md/);
        assert.equal(execFileSync('unzip', ['-p', args[3], 'SKILL.md'], { encoding: 'utf8' }).trim(),
          git(origin, 'show', `${tag}:plugins/fulcrum-ai-toolkit/SKILL.md`));
      }
      releases.get(tag).assets = [{
        name: path.basename(args[3]), size: fs.statSync(args[3]).size
      }];
    } else if (action === 'edit') {
      releases.get(tag).draft = false;
    } else {
      assert.fail(`Unexpected gh command: ${args.join(' ')}`);
    }
    return '';
  };
  const run = (override = github) => releaseToolkit({
    root: checkout, repository: 'example/toolkit', github: override
  });
  return { root, origin, author, checkout, introduction, releases, calls, github, run };
}

function addMerge(author, name) {
  git(author, 'pull', '--ff-only', 'origin', 'main');
  git(author, 'checkout', '-b', name);
  write(author, `${name}.txt`, `${name}\n`);
  git(author, 'add', '.');
  git(author, 'commit', '-m', `Implement ${name}`);
  git(author, 'checkout', 'main');
  git(author, 'merge', '--no-ff', name, '-m', `Merge ${name}`);
  git(author, 'push', 'origin', 'main');
  return git(author, 'rev-parse', 'HEAD');
}

function assertAligned(root, ref, version) {
  for (const relativePath of VERSION_FILES) {
    const document = JSON.parse(git(root, 'show', `${ref}:${relativePath}`));
    if (relativePath === '.github/plugin/marketplace.json') {
      assert.equal(document.metadata.version, version);
      assert.equal(document.plugins[0].version, version);
    } else {
      assert.equal(document.version, version);
    }
  }
}

test('patch bump aligns every host version without touching skill versions or formatting', (t) => {
  const { checkout } = fixture(t);
  const before = fs.readFileSync(path.join(checkout, '.claude-plugin/plugin.json'), 'utf8');
  const skill = 'plugins/fulcrum-ai-toolkit/skills/example/SKILL.md';
  const skillBefore = fs.readFileSync(path.join(checkout, skill), 'utf8');
  assert.equal(bumpPluginVersion(checkout), '0.1.4');
  assert.equal(fs.readFileSync(path.join(checkout, '.claude-plugin/plugin.json'), 'utf8'),
    before.replace('"0.1.3"', '"0.1.4"'));
  assert.equal(fs.readFileSync(path.join(checkout, skill), 'utf8'), skillBefore);
});

test('invalid or mismatched manifest versions fail before writing any files', (t) => {
  const { checkout } = fixture(t);
  const target = path.join(checkout, manifest);
  const before = fs.readFileSync(target, 'utf8');
  const mismatch = VERSION_FILES.at(-1);
  write(checkout, mismatch, fs.readFileSync(path.join(checkout, mismatch), 'utf8')
    .replace('"0.1.3"', '"9.0.0"'));
  assert.throws(() => bumpPluginVersion(checkout), /versions must match/);
  assert.equal(fs.readFileSync(target, 'utf8'), before);
  write(checkout, manifest, before.replace('"0.1.3"', '"01.1.3"'));
  assert.throws(() => bumpPluginVersion(checkout), /invalid toolkit version/i);
  write(checkout, manifest, before.replace('"0.1.3"', '"0.1.3-alpha.1"'));
  assert.throws(() => bumpPluginVersion(checkout), /prerelease\/build metadata is not supported/i);
});

test('each mainline merge gets one aligned tagged release, including replaced pending runs', (t) => {
  const { author, origin, checkout, introduction, releases, calls, run } = fixture(t);
  const first = addMerge(author, 'first-feature');
  const second = addMerge(author, 'second-feature');
  run();
  assert.deepEqual([...releases.keys()], ['v0.1.4', 'v0.1.5', 'v0.1.6']);
  assert.equal(git(checkout, 'symbolic-ref', '--quiet', 'HEAD'), 'refs/heads/main');
  for (const [index, source] of [introduction, first, second].entries()) {
    const version = `0.1.${index + 4}`;
    const tag = `v${version}`;
    const commit = git(origin, 'rev-parse', `${tag}^{commit}`);
    assertAligned(origin, commit, version);
    assert.match(git(origin, 'show', '-s', '--format=%B', commit),
      new RegExp(`Toolkit-Release-Source: ${source}`));
    assert.equal(git(origin, 'show', '-s', '--format=%an', commit), 'github-actions[bot]');
    assert.equal(releases.get(tag).draft, false);
    assert.equal(releases.get(tag).assets.length, 1);
    assert.equal(git(origin, 'show', `${commit}:plugins/fulcrum-ai-toolkit/skills/example/SKILL.md`)
      .includes('version: "1.2.3"'), true);
  }
  const tip = git(origin, 'rev-parse', 'main');
  calls.length = 0;
  run();
  assert.equal(git(origin, 'rev-parse', 'main'), tip);
  assert.deepEqual(calls.map((args) => args[0]), ['api']);
  assert.equal(git(checkout, 'symbolic-ref', '--quiet', 'HEAD'), 'refs/heads/main');
  assert.equal(git(checkout, 'status', '--porcelain', '--untracked-files=no'), '');
});

for (const failure of ['create', 'upload', 'edit']) {
  test(`reruns resume a failed release ${failure} without another patch bump`, (t) => {
    const { origin, releases, github, run } = fixture(t);
    assert.throws(() => run((args) => {
      if (args[0] === 'release' && args[1] === failure) throw new Error('GitHub unavailable');
      return github(args);
    }), /GitHub unavailable/);
    const checkpoint = git(origin, 'rev-parse', 'main');
    assertAligned(origin, checkpoint, '0.1.4');
    run();
    assert.equal(git(origin, 'rev-parse', 'main'), checkpoint);
    assert.deepEqual([...releases.keys()], ['v0.1.4']);
    assert.equal(releases.get('v0.1.4').draft, false);
    assert.ok(releases.get('v0.1.4').assets[0].size > 0);
  });
}

test('a new merge after a failed publication is released only after the interrupted release resumes', (t) => {
  const { origin, author, github, releases, run } = fixture(t);
  assert.throws(() => run((args) => {
    if (args[1] === 'upload') throw new Error('Upload interrupted');
    return github(args);
  }), /Upload interrupted/);
  const checkpoint = git(origin, 'rev-parse', 'main');
  addMerge(author, 'later-feature');
  run();
  assert.equal(git(origin, 'rev-parse', 'v0.1.4'), checkpoint);
  assert.deepEqual([...releases.keys()], ['v0.1.4', 'v0.1.5']);
  assert.ok([...releases.values()].every((release) => !release.draft));
});

test('GitHub API errors fail visibly without creating a version commit', (t) => {
  const { origin, introduction, run } = fixture(t);
  assert.throws(() => run(() => { throw new Error('API permission denied'); }), /API permission denied/);
  assert.equal(git(origin, 'rev-parse', 'main'), introduction);
  assert.equal(git(origin, 'tag'), '');
});

test('a published release missing its bundle is repaired without a new version', (t) => {
  const { origin, releases, calls, run } = fixture(t);
  run();
  const checkpoint = git(origin, 'rev-parse', 'main');
  releases.get('v0.1.4').assets = [];
  calls.length = 0;
  run();
  assert.equal(git(origin, 'rev-parse', 'main'), checkpoint);
  assert.equal(releases.get('v0.1.4').assets.length, 1);
  assert.equal(calls.some((args) => args[1] === 'create'), false);
});

test('release repair tolerates missing assets arrays from API responses', (t) => {
  const { releases, run } = fixture(t);
  run();
  releases.get('v0.1.4').assets = null;
  assert.doesNotThrow(() => run());
  assert.equal(releases.get('v0.1.4').assets.length, 1);
});

test('a tag moved away from its checkpoint is not published or silently accepted', (t) => {
  const { origin, checkout, introduction, run } = fixture(t);
  run();
  git(origin, 'update-ref', 'refs/tags/v0.1.4', introduction);
  git(checkout, 'tag', '--force', 'v0.1.4', introduction);
  assert.throws(() => run(), /does not point to release commit/);
});

test('release checkout must not contain uncommitted tracked edits', (t) => {
  const { checkout, origin, introduction, run } = fixture(t);
  write(checkout, manifest, '{}\n');
  assert.throws(() => run(), /uncommitted tracked changes/);
  assert.equal(git(origin, 'rev-parse', 'main'), introduction);
});

test('branch protection failures do not leave a tag or publish a release', (t) => {
  const { origin, introduction, releases, run } = fixture(t);
  const hook = path.join(origin, 'hooks/pre-receive');
  fs.writeFileSync(hook, '#!/usr/bin/env node\nprocess.stderr.write("Bot push is blocked\\n");\nprocess.exit(1);\n', { mode: 0o755 });
  assert.throws(() => run(), /Cannot push release checkpoint[\s\S]*Bot push is blocked/);
  assert.equal(git(origin, 'rev-parse', 'main'), introduction);
  assert.equal(git(origin, 'tag'), '');
  assert.equal(releases.size, 0);
});

test('a merge racing the atomic push is retried without a stray tag or missed release', (t) => {
  const { root, checkout, author, origin, releases, run } = fixture(t);
  const marker = path.join(root, 'raced');
  const hook = path.join(checkout, '.git/hooks/pre-push');
  fs.writeFileSync(hook, `#!/usr/bin/env node
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
if (!fs.existsSync(${JSON.stringify(marker)})) {
  fs.writeFileSync(${JSON.stringify(marker)}, '');
  const env = { ...process.env };
  delete env.GIT_DIR;
  delete env.GIT_WORK_TREE;
  fs.writeFileSync(${JSON.stringify(path.join(author, 'racing.txt'))}, 'race\\n');
  execFileSync('git', ['-C', ${JSON.stringify(author)}, 'add', 'racing.txt'], { env });
  execFileSync('git', ['-C', ${JSON.stringify(author)}, 'commit', '-m', 'Concurrent main update'], { env });
  execFileSync('git', ['-C', ${JSON.stringify(author)}, 'push', 'origin', 'main'], { env });
}
`, { mode: 0o755 });
  run();
  assert.deepEqual([...releases.keys()], ['v0.1.4', 'v0.1.5']);
  assert.equal(git(origin, 'show', 'main:racing.txt'), 'race');
  assertAligned(origin, 'main', '0.1.5');
});
