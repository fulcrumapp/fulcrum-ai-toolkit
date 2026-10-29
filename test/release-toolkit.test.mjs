import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { bumpPluginVersion, releaseToolkit, VERSION_FILES } from '../scripts/release-toolkit.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = VERSION_FILES[0];
function git(root, ...args) {
  const gitDir = root.endsWith('.git') ? ['--git-dir', root] : [];
  return execFileSync('git', [...gitDir, ...args], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}
function write(root, file, contents) {
  const target = path.join(root, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, contents);
}
function fixture(t, bot = 'release-bot') {
  const root = fs.mkdtempSync(path.join(repoRoot, '.release-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const origin = path.join(root, 'origin.git');
  const author = path.join(root, 'author');
  const checkout = path.join(root, 'checkout');
  git(root, 'init', '--bare', '--initial-branch=main', origin);
  git(root, 'clone', origin, author);
  git(author, 'config', 'user.name', 'Test');
  git(author, 'config', 'user.email', 'test@example.invalid');
  for (const file of VERSION_FILES) {
    write(author, file, fs.readFileSync(path.join(repoRoot, file), 'utf8')
      .replace(/("version"\s*:\s*")[^"]*(")/g, (_, a, b) => `${a}0.1.3${b}`));
  }
  write(author, '.gitignore', '.m365-bundle-stage/\nfulcrum-ai-toolkit-m365.zip\n');
  write(author, 'plugins/fulcrum-ai-toolkit/SKILL.md', '# Fixture toolkit\n');
  write(author, 'plugins/fulcrum-ai-toolkit/LICENSE', 'Fixture license\n');
  write(author, 'plugins/fulcrum-ai-toolkit/skills/example/SKILL.md', '---\nname: example\nmetadata:\n  version: "1.2.3"\n---\n# Example\n');
  write(author, 'scripts/build-m365-bundle.mjs', fs.readFileSync(path.join(repoRoot, 'scripts/build-m365-bundle.mjs'), 'utf8'));
  git(author, 'add', '.'); git(author, 'commit', '-m', 'Initial'); git(author, 'push', 'origin', 'main');
  git(root, 'clone', origin, checkout);
  const prs = []; const releases = new Map(); const calls = [];
  let next = 1;
  function record(sha, name, number = next++) {
    const pr = { number, state: 'closed', merged_at: '2026-01-01T00:00:00Z', merge_commit_sha: sha,
      user: { login: 'developer' }, head: { ref: name, sha, repo: { full_name: 'example/toolkit' } }, base: { ref: 'main' } };
    prs.push(pr); return pr;
  }
  function addMerge(name) {
    git(author, 'pull', '--ff-only', 'origin', 'main');
    write(author, `${name}.txt`, `${name}\n`); git(author, 'add', '.'); git(author, 'commit', '-m', name);
    git(author, 'push', 'origin', 'main');
    return record(git(author, 'rev-parse', 'HEAD'), name);
  }
  const rollout = addMerge('rollout');
  const github = (args) => {
    calls.push(args);
    if (args[0] === 'api' && args.at(-1) === 'installation/repositories?per_page=100') {
      return JSON.stringify([{ repositories: [{ full_name: 'example/toolkit' }] }]);
    }
    if (args[0] === 'api' && args.at(-1).includes('/pulls?')) {
      return JSON.stringify([args.at(-1).includes('state=open') ? prs.filter((pr) => pr.state === 'open') : prs]);
    }
    if (args[0] === 'api' && args.at(-1).includes('/releases?')) return JSON.stringify([[...releases.values()]]);
    if (args[0] === 'api' && args.at(-1).includes('/releases/tags/')) {
      return JSON.stringify(releases.get(args.at(-1).split('/').at(-1)));
    }
    if (args[0] === 'api' && args.at(-1).includes('/rules/branches/main?')) return JSON.stringify([[{ type: 'merge_queue' }]]);
    if (args[0] === 'pr' && args[1] === 'create') {
      const sha = git(origin, 'rev-parse', 'refs/heads/toolkit-release/queue');
      prs.push({ number: next++, state: 'open', merged_at: null, merge_commit_sha: null,
        user: { login: bot }, head: { ref: 'toolkit-release/queue', sha, repo: { full_name: 'example/toolkit' } }, base: { ref: 'main' } });
      return '';
    }
    if (args[0] === 'pr' && args[1] === 'merge') return '';
    if (args[0] === 'release') {
      const [, action, tag] = args;
      if (action === 'create') releases.set(tag, { tag_name: tag, author: { login: bot }, draft: true, assets: [] });
      else if (action === 'upload') {
        const contents = fs.readFileSync(args[3]);
        releases.get(tag).assets = [{
          name: path.basename(args[3]), size: contents.length
        }];
      }
      else if (action === 'edit') releases.get(tag).draft = false;
      else assert.fail(args.join(' '));
      return '';
    }
    assert.fail(args.join(' '));
  };
  const run = (override = github, options = {}) => releaseToolkit({ root: checkout, repository: 'example/toolkit',
    github: override, token: 'fixture', login: bot, rollout: String(rollout.number), ...options });
  function mergeRelease(groupChanges) {
    const pr = prs.find((item) => item.state === 'open' && item.user.login === bot);
    assert.ok(pr);
    const sha = git(origin, 'rev-parse', 'refs/heads/toolkit-release/queue');
    pr.head.sha = sha;
    git(origin, 'update-ref', `refs/pull/${pr.number}/head`, sha);
    git(author, 'pull', '--ff-only', 'origin', 'main');
    git(author, 'fetch', 'origin', 'refs/heads/toolkit-release/queue');
    if (groupChanges) {
      git(author, 'merge', '--no-ff', '--no-commit', 'FETCH_HEAD');
      groupChanges(author);
      git(author, 'add', '.');
      git(author, 'commit', '-m', 'Merge release group');
    } else git(author, 'merge', '--no-ff', 'FETCH_HEAD', '-m', 'Merge release');
    git(author, 'push', 'origin', 'main');
    pr.state = 'closed'; pr.merged_at = '2026-01-01T00:00:00Z'; pr.merge_commit_sha = git(author, 'rev-parse', 'HEAD');
    return pr;
  }
  return { root, origin, author, checkout, prs, releases, calls, github, run, addMerge, mergeRelease, record };
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

test('patch bump ignores unrelated nested version keys', (t) => {
  const { checkout } = fixture(t);
  const target = '.claude-plugin/plugin.json';
  const original = JSON.parse(fs.readFileSync(path.join(checkout, target), 'utf8'));
  original.nested = { version: '0.1.3' };
  write(checkout, target, `${JSON.stringify(original, null, 2)}\n`);

  assert.equal(bumpPluginVersion(checkout), '0.1.4');

  const updated = JSON.parse(fs.readFileSync(path.join(checkout, target), 'utf8'));
  assert.equal(updated.version, '0.1.4');
  assert.equal(updated.nested.version, '0.1.3');
});

test('patch bump handles non-two-space JSON indentation', (t) => {
  const { checkout } = fixture(t);
  const target = '.claude-plugin/plugin.json';
  const original = JSON.parse(fs.readFileSync(path.join(checkout, target), 'utf8'));
  write(checkout, target, `${JSON.stringify(original, null, 4)}\n`);

  assert.equal(bumpPluginVersion(checkout), '0.1.4');

  const updated = JSON.parse(fs.readFileSync(path.join(checkout, target), 'utf8'));
  assert.equal(updated.version, '0.1.4');
});

test('patch bump updates top-level version when nested version appears first', (t) => {
  const { checkout } = fixture(t);
  const target = '.claude-plugin/plugin.json';
  const original = JSON.parse(fs.readFileSync(path.join(checkout, target), 'utf8'));
  const reordered = { nested: { version: '0.1.3' }, ...original };
  write(checkout, target, `${JSON.stringify(reordered, null, 2)}\n`);

  assert.equal(bumpPluginVersion(checkout), '0.1.4');

  const updated = JSON.parse(fs.readFileSync(path.join(checkout, target), 'utf8'));
  assert.equal(updated.version, '0.1.4');
  assert.equal(updated.nested.version, '0.1.3');
});

test('patch bump updates only marketplace target version paths', (t) => {
  const { checkout } = fixture(t);
  const target = '.github/plugin/marketplace.json';
  const original = JSON.parse(fs.readFileSync(path.join(checkout, target), 'utf8'));
  original.metadata.nested = { version: '0.1.3' };
  original.plugins[0].nested = { version: '0.1.3' };
  write(checkout, target, `${JSON.stringify(original, null, 2)}\n`);

  assert.equal(bumpPluginVersion(checkout), '0.1.4');

  const updated = JSON.parse(fs.readFileSync(path.join(checkout, target), 'utf8'));
  assert.equal(updated.metadata.version, '0.1.4');
  assert.equal(updated.plugins[0].version, '0.1.4');
  assert.equal(updated.metadata.nested.version, '0.1.3');
  assert.equal(updated.plugins[0].nested.version, '0.1.3');
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

test('releases each pending PR independently without pushing main', (t) => {
  const f = fixture(t); const source = f.addMerge('feature'); f.addMerge('second-feature');
  const main = git(f.origin, 'rev-parse', 'main');
  f.run();
  assert.equal(git(f.origin, 'rev-parse', 'main'), main);
  assert.equal(f.prs.filter((pr) => pr.state === 'open').length, 1);
  assert.ok(f.calls.some((args) => args[0] === 'pr' && args[1] === 'merge' && args.includes('--auto')));
  f.run();
  assert.equal(f.prs.filter((pr) => pr.state === 'open').length, 1);
  for (const [index, sourceNumber] of [1, source.number, source.number + 1].entries()) {
    const active = f.prs.find((pr) => pr.state === 'open');
    assert.match(git(f.origin, 'show', '-s', '--format=%B', active.head.sha),
      new RegExp(`Toolkit-Release-Source-PR: ${sourceNumber}(?:\\n|$)`));
    const pr = f.mergeRelease(); f.run();
    assert.equal(git(f.origin, 'rev-parse', `v0.1.${index + 4}`), pr.merge_commit_sha);
    assert.equal(f.releases.get(`v0.1.${index + 4}`).draft, false);
  }
  f.run();
  assert.equal(f.prs.filter((item) => item.state === 'open').length, 0);
});

test('new sources after candidate base are released in the next batch', (t) => {
  const f = fixture(t); f.run(); f.addMerge('later'); f.mergeRelease(); f.run();
  assert.equal(f.prs.filter((pr) => pr.state === 'open').length, 1);
  f.mergeRelease(); f.run();
  assert.deepEqual([...f.releases.keys()], ['v0.1.4', 'v0.1.5']);
});

test('orders sources sharing a merge-group commit and releases each once', (t) => {
  const f = fixture(t);
  const first = f.addMerge('group');
  const second = f.record(first.merge_commit_sha, 'group-other');
  f.prs.reverse();
  f.run();
  for (const source of [1, first.number, second.number]) {
    const active = f.prs.find((pr) => pr.state === 'open');
    assert.match(git(f.origin, 'show', '-s', '--format=%B', active.head.sha),
      new RegExp(`Toolkit-Release-Source-PR: ${source}(?:\\n|$)`));
    f.mergeRelease(); f.run();
  }
  assert.deepEqual([...f.releases.keys()], ['v0.1.4', 'v0.1.5', 'v0.1.6']);
});

test('rollout boundary excludes earlier PRs sharing its merge commit', (t) => {
  const f = fixture(t);
  const rollout = f.prs[0];
  const earlier = f.record(rollout.merge_commit_sha, 'earlier', 40);
  earlier.merged_at = '2025-12-31T23:59:59Z';
  const later = f.record(rollout.merge_commit_sha, 'later', 41);
  later.merged_at = '2026-01-01T00:00:01Z';
  f.run(); f.mergeRelease(); f.run();
  const active = f.prs.find((pr) => pr.state === 'open');
  assert.match(git(f.origin, 'show', '-s', '--format=%B', active.head.sha),
    /Toolkit-Release-Source-PR: 41(?:\n|$)/);
  f.mergeRelease(); f.run();
  assert.equal(f.releases.size, 2);
});

test('a release grouped with another PR validates manifests and queues that source separately', (t) => {
  const f = fixture(t); f.run();
  const pr = f.mergeRelease((author) => {
    write(author, 'other-feature.txt', 'new feature\n');
    const file = '.claude-plugin/plugin.json';
    const document = JSON.parse(fs.readFileSync(path.join(author, file), 'utf8'));
    document.groupedChange = true;
    write(author, file, `${JSON.stringify(document, null, 2)}\n`);
  });
  const source = f.record(pr.merge_commit_sha, 'grouped-feature');
  f.run();
  assert.equal(f.releases.get('v0.1.4').draft, false);
  const next = f.prs.find((item) => item.state === 'open');
  assert.match(git(f.origin, 'show', '-s', '--format=%B', next.head.sha),
    new RegExp(`Toolkit-Release-Source-PR: ${source.number}(?:\\n|$)`));
  f.mergeRelease(); f.run();
  assert.deepEqual([...f.releases.keys()], ['v0.1.4', 'v0.1.5']);
});

test('rejects a grouped merge with conflicting manifest versions', (t) => {
  const f = fixture(t); f.run();
  const pr = f.mergeRelease((author) => {
    const file = '.claude-plugin/plugin.json';
    const document = JSON.parse(fs.readFileSync(path.join(author, file), 'utf8'));
    document.version = '9.9.9';
    write(author, file, `${JSON.stringify(document, null, 2)}\n`);
  });
  f.record(pr.merge_commit_sha, 'conflicting-feature');
  assert.throws(() => f.run(), /conflicting version/);
  assert.equal(f.releases.size, 0);
});

test('installation reconciliation uses read-only identity context without user or reactions', (t) => {
  const bot = 'release-app[bot]'; const f = fixture(t, bot);
  f.run(); f.mergeRelease(); f.run();
  assert.equal(f.releases.get('v0.1.4').draft, false);
  assert.ok(f.calls.some((args) => args.at(-1) === 'installation/repositories?per_page=100'));
  assert.equal(f.calls.some((args) => args[0] === 'api' &&
    (args.includes('user') || args.some((arg) => arg.includes('/reactions')) || args.includes('POST'))), false);
});

test('rejects inaccessible or malformed installation repository responses', (t) => {
  const f = fixture(t, 'release-app[bot]');
  for (const response of ['[]', '[{}]', '[{"repositories":[{"full_name":"other/repo"}]}]']) {
    assert.throws(() => f.run((args) => args.at(-1) === 'installation/repositories?per_page=100'
      ? response : f.github(args)), /installation access/);
  }
  assert.equal(f.calls.some((args) => args[0] === 'pr' || args[0] === 'release'), false);
});

test('installation context cannot bypass a PR author mismatch', (t) => {
  const bot = 'release-app[bot]'; const f = fixture(t, bot);
  const github = (args) => {
    const result = f.github(args);
    if (args[0] === 'pr' && args[1] === 'create') f.prs.at(-1).user.login = 'attacker';
    return result;
  };
  assert.throws(() => f.run(github), /Could not uniquely verify/);
  assert.equal(f.calls.some((args) => args[0] === 'pr' && args[1] === 'merge'), false);
});

test('rejects a merged release PR by a different author', (t) => {
  const f = fixture(t); f.run(); const pr = f.mergeRelease();
  pr.user.login = 'attacker';
  assert.throws(() => f.run(), /untrusted author/);
  assert.equal(f.releases.size, 0);
});

test('rejects an existing release by a different author', (t) => {
  const f = fixture(t); f.run(); f.mergeRelease();
  f.releases.set('v0.1.4', { tag_name: 'v0.1.4', author: { login: 'attacker' }, draft: true, assets: [] });
  assert.throws(() => f.run(), /Conflicting release/);
  assert.equal(f.calls.some((args) => args[0] === 'release'), false);
});

test('verifies a newly created release author before uploading', (t) => {
  const f = fixture(t); f.run(); f.mergeRelease();
  assert.throws(() => f.run((args) => {
    const result = f.github(args);
    if (args[0] === 'release' && args[1] === 'create') {
      f.releases.get('v0.1.4').author.login = 'attacker';
    }
    return result;
  }), /Conflicting release/);
  assert.equal(f.calls.some((args) => args[0] === 'release' && ['upload', 'edit'].includes(args[1])), false);
});

test('rejects a merged release that reuses a processed source PR', (t) => {
  const f = fixture(t); f.addMerge('second'); f.run(); f.mergeRelease(); f.run();
  const active = f.prs.find((pr) => pr.state === 'open');
  git(f.author, 'fetch', 'origin', 'refs/heads/toolkit-release/queue');
  git(f.author, 'checkout', '--detach', 'FETCH_HEAD');
  const base = git(f.author, 'rev-parse', 'HEAD^');
  const subject = git(f.author, 'show', '-s', '--format=%s', 'HEAD');
  git(f.author, 'commit', '--amend', '-m', subject,
    '-m', `Toolkit-Release-Base: ${base}\nToolkit-Release-Source-PR: 1`);
  git(f.author, 'push', '--force', 'origin', 'HEAD:refs/heads/toolkit-release/queue');
  active.head.sha = git(f.author, 'rev-parse', 'HEAD');
  git(f.author, 'checkout', 'main');
  f.mergeRelease();
  assert.throws(() => f.run(), /invalid or already processed source PR #1/);
  assert.equal(f.releases.size, 1);
});

for (const stage of ['create', 'upload', 'edit']) {
  test(`publication resumes after ${stage} failure`, (t) => {
    const f = fixture(t); f.run(); f.mergeRelease();
    assert.throws(() => f.run((args) => {
      if (args[0] === 'release' && args[1] === stage) throw new Error('injected failure');
      return f.github(args);
    }), /injected failure/);
    f.run(); assert.equal(f.releases.get('v0.1.4').draft, false);
    assert.equal(f.prs.filter((pr) => pr.state === 'open').length, 0);
  });
}

test('publish restores tracked build changes and reports leftover untracked files', (t) => {
  const f = fixture(t); f.run(); f.mergeRelease();
  assert.throws(() => f.run((args) => {
    const result = f.github(args);
    if (args[0] === 'release' && args[1] === 'upload') {
      write(f.checkout, manifest, '{}\n');
      write(f.checkout, 'unexpected-artifact.txt', 'leftover\n');
    }
    return result;
  }), /Release build left unexpected workspace changes:[\s\S]*unexpected-artifact\.txt/);
  assert.equal(git(f.checkout, 'status', '--porcelain', '--untracked-files=no'), '');
  assert.equal(fs.readFileSync(path.join(f.checkout, 'unexpected-artifact.txt'), 'utf8'), 'leftover\n');
});

test('recovers orphan branch after PR creation failure', (t) => {
  const f = fixture(t);
  assert.throws(() => f.run((args) => {
    if (args[0] === 'pr' && args[1] === 'create') throw new Error('interrupted');
    return f.github(args);
  }), /interrupted/);
  const head = git(f.origin, 'rev-parse', 'refs/heads/toolkit-release/queue');
  f.run(); assert.equal(git(f.origin, 'rev-parse', 'refs/heads/toolkit-release/queue'), head);
  assert.equal(f.prs.filter((pr) => pr.state === 'open').length, 1);
});

test('recovers when PR creation succeeds but its response is lost', (t) => {
  const f = fixture(t);
  assert.throws(() => f.run((args) => {
    const result = f.github(args);
    if (args[0] === 'pr' && args[1] === 'create') throw new Error('lost response');
    return result;
  }), /lost response/);
  f.run();
  assert.equal(f.prs.filter((pr) => pr.state === 'open').length, 1);
});

test('refreshes a stale release candidate after a manual version change', (t) => {
  const f = fixture(t); f.run();
  const old = git(f.origin, 'rev-parse', 'refs/heads/toolkit-release/queue');
  git(f.author, 'pull', '--ff-only', 'origin', 'main');
  bumpPluginVersion(f.author);
  git(f.author, 'add', '--', ...VERSION_FILES);
  git(f.author, 'commit', '-m', 'Manual version bump');
  git(f.author, 'push', 'origin', 'main');
  const sha = git(f.author, 'rev-parse', 'HEAD');
  f.prs.push({ number: 20, state: 'closed', merged_at: '2026-01-01T00:00:00Z', merge_commit_sha: sha,
    user: { login: 'developer' }, head: { ref: 'manual', sha, repo: { full_name: 'example/toolkit' } }, base: { ref: 'main' } });
  f.run();
  const updated = git(f.origin, 'rev-parse', 'refs/heads/toolkit-release/queue');
  assert.notEqual(updated, old);
  assert.equal(JSON.parse(git(f.origin, 'show', `${updated}:${manifest}`)).version, '0.1.5');
  assert.ok(f.calls.some((args) => args[0] === 'pr' && args[1] === 'merge' &&
    args.includes('--match-head-commit') && args.includes(updated)));
  f.mergeRelease(); f.run();
  assert.equal(f.releases.get('v0.1.5').draft, false);
});

test('does not queue without an effective merge queue rule', (t) => {
  const f = fixture(t);
  assert.throws(() => f.run((args) => args.at(-1)?.includes('/rules/branches/main?')
    ? '[[]]' : f.github(args)), /merge queue rule/);
  assert.equal(f.calls.some((args) => args[0] === 'pr'), false);
});

test('retries queue failure without creating another PR', (t) => {
  const f = fixture(t);
  assert.throws(() => f.run((args) => {
    if (args[0] === 'pr' && args[1] === 'merge') throw new Error('queue unavailable');
    return f.github(args);
  }), /queue unavailable/);
  f.run();
  assert.equal(f.prs.filter((pr) => pr.state === 'open').length, 1);
});

test('accepts digest-only differences when existing asset size matches', (t) => {
  const f = fixture(t); f.run(); f.mergeRelease(); f.run();
  f.releases.get('v0.1.4').assets[0].digest = 'sha256:bad';
  const before = f.calls.length;
  f.run();
  assert.equal(f.calls.slice(before).some((args) => args[0] === 'release' && args[1] === 'upload'), false);
});

test('refuses an existing asset with a mismatched size even when its digest matches', (t) => {
  const f = fixture(t); f.run(); f.mergeRelease(); f.run();
  f.releases.get('v0.1.4').assets[0].size += 1;
  const before = f.calls.length;
  assert.throws(() => f.run(), /Conflicting or unverifiable asset/);
  assert.equal(f.calls.slice(before).some((args) => args[0] === 'release' && args[1] === 'upload'), false);
});

test('fails closed on malformed configuration and tag conflicts', (t) => {
  const f = fixture(t);
  assert.throws(() => f.run(f.github, { token: '' }), /GH_TOKEN/);
  assert.throws(() => f.run(f.github, { rollout: '' }), /ROLLOUT/);
  f.run(); const pr = f.mergeRelease();
  git(f.origin, 'update-ref', 'refs/tags/v0.1.4', `${pr.merge_commit_sha}^1`);
  assert.throws(() => f.run(), /Conflicting remote tag/);
});

test('accepts an annotated remote tag pointing to the release commit', (t) => {
  const f = fixture(t); f.run(); const pr = f.mergeRelease();
  git(f.author, 'tag', '-a', 'v0.1.4', pr.merge_commit_sha, '-m', 'Release v0.1.4');
  git(f.author, 'push', 'origin', 'refs/tags/v0.1.4');
  f.run();
  assert.equal(f.releases.get('v0.1.4').draft, false);
});

test('untrusted release-like PR is processed as a source', (t) => {
  const f = fixture(t); const pr = f.addMerge('pretend-release');
  pr.head.ref = 'toolkit-release/queue'; pr.head.repo.full_name = 'attacker/fork'; pr.user.login = 'attacker';
  f.run(); f.mergeRelease(); f.run();
  f.mergeRelease(); f.run();
  assert.equal(f.releases.size, 2);
});

test('refuses an active PR by an untrusted author', (t) => {
  const f = fixture(t); f.run(); f.prs.find((p) => p.state === 'open').user.login = 'attacker';
  assert.throws(() => f.run(), /untrusted author/);
});

test('fails closed if a bot release PR loses its head repository identity', (t) => {
  const f = fixture(t); f.run(); f.mergeRelease();
  f.prs.find((pr) => pr.user.login === 'release-bot').head.repo = null;
  assert.throws(() => f.run(), /Cannot verify release branch repository/);
  assert.equal(f.releases.size, 0);
});

test('refuses to publish a release merged with a stale manifest', (t) => {
  const f = fixture(t); f.run();
  git(f.author, 'pull', '--ff-only', 'origin', 'main');
  bumpPluginVersion(f.author);
  git(f.author, 'add', '--', ...VERSION_FILES); git(f.author, 'commit', '-m', 'Concurrent manual version');
  git(f.author, 'push', 'origin', 'main');
  const sha = git(f.author, 'rev-parse', 'HEAD');
  f.prs.push({ number: 20, state: 'closed', merged_at: '2026-01-01T00:00:00Z', merge_commit_sha: sha,
    user: { login: 'developer' }, head: { ref: 'manual', sha, repo: { full_name: 'example/toolkit' } }, base: { ref: 'main' } });
  // Model an externally accepted squash merge with a version equal to its
  // parent, so no release manifest diff survived the merge.
  const pr = f.prs.find((item) => item.state === 'open');
  git(f.origin, 'update-ref', `refs/pull/${pr.number}/head`, pr.head.sha);
  git(f.author, 'commit', '--allow-empty', '-m', 'Merged stale release');
  git(f.author, 'push', 'origin', 'main');
  pr.state = 'closed'; pr.merged_at = '2026-01-01T00:00:00Z'; pr.merge_commit_sha = git(f.author, 'rev-parse', 'HEAD');
  assert.throws(() => f.run(), /unexpected files/);
  assert.equal(f.releases.size, 0);
});

test('refuses release commit containing unrelated changes', (t) => {
  const f = fixture(t); f.run();
  git(f.author, 'fetch', 'origin', 'refs/heads/toolkit-release/queue');
  git(f.author, 'checkout', '--detach', 'FETCH_HEAD');
  write(f.author, 'injected.txt', 'bad\n'); git(f.author, 'add', '.'); git(f.author, 'commit', '--amend', '--no-edit');
  git(f.author, 'push', '--force', 'origin', 'HEAD:refs/heads/toolkit-release/queue');
  f.prs.find((p) => p.state === 'open').head.sha = git(f.author, 'rev-parse', 'HEAD');
  assert.throws(() => f.run(), /unexpected files/);
});
