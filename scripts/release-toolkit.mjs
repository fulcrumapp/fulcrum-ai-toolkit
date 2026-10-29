#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = 'plugins/fulcrum-ai-toolkit/plugin.json';
const MARKETPLACE = '.github/plugin/marketplace.json';
export const VERSION_FILES = [
  MANIFEST,
  '.claude-plugin/plugin.json',
  'plugins/fulcrum-ai-toolkit/.claude-plugin/plugin.json',
  'plugins/fulcrum-ai-toolkit/.codex-plugin/plugin.json',
  'plugins/fulcrum-ai-toolkit/.cursor-plugin/plugin.json',
  'plugins/fulcrum-ai-toolkit/gemini-extension.json',
  MARKETPLACE
];
const ASSET = 'fulcrum-ai-toolkit-m365.zip';
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

function git(root, ...args) {
  return execFileSync('git', args, {
    cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']
  }).trim();
}

function runGitHubCli(root, args, env = undefined) {
  try {
    return execFileSync('gh', args, {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: env ? { ...process.env, ...env } : process.env
    });
  } catch (error) {
    const status = Number.isInteger(error?.status) ? ` (exit ${error.status})` : '';
    const stdout = error?.stdout?.toString().trim();
    const stderr = error?.stderr?.toString().trim();
    const details = [stdout, stderr].filter(Boolean).join('\n');
    throw new Error(`gh ${args.join(' ')} failed${status}.${details ? `\n${details}` : ''}`);
  }
}

function checkoutRef(root, branch, head) {
  if (branch) {
    git(root, 'checkout', '--quiet', branch);
  } else {
    git(root, 'checkout', '--quiet', '--detach', head);
  }
}

function parsePatchVersion(version, context) {
  if (typeof version !== 'string') {
    throw new Error(`${context}: version must be a string`);
  }
  if (version.includes('-') || version.includes('+')) {
    throw new Error(`${context}: prerelease/build metadata is not supported for automated patch releases (${version})`);
  }
  const parts = version.match(SEMVER);
  if (!parts) {
    throw new Error(`${context}: invalid toolkit version ${version}`);
  }
  return parts;
}

function remoteTagCommit(root, tag) {
  const output = git(
    root,
    'ls-remote',
    '--tags',
    'origin',
    `refs/tags/${tag}`,
    `refs/tags/${tag}^{}`
  );
  if (!output) return null;
  let direct = null;
  let peeled = null;
  for (const line of output.split('\n')) {
    const [sha, ref] = line.trim().split(/\s+/);
    if (!sha || !ref) continue;
    if (ref === `refs/tags/${tag}`) direct = sha;
    if (ref === `refs/tags/${tag}^{}`) peeled = sha;
  }
  return peeled ?? direct;
}

function cleanupReleaseArtifacts(root) {
  fs.rmSync(path.join(root, ASSET), { force: true });
  fs.rmSync(path.join(root, '.m365-bundle-stage'), { recursive: true, force: true });
}

function fetchMainAndTags(root) {
  const inGitHubActions = process.env.GITHUB_ACTIONS === 'true';
  if (inGitHubActions) {
    git(root, 'fetch', '--force', '--prune', '--prune-tags', '--tags', 'origin', 'main');
    return;
  }
  git(root, 'fetch', 'origin', 'main');
}

function replaceTopLevelStringProperty(text, key, expectedValue, nextValue, context) {
  let depth = 0;
  let inString = false;
  let escaped = false;
  let stringStart = -1;
  let replaced = false;

  for (let i = 0; i < text.length; i += 1) {
    const character = text[i];
    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (character === '\\') {
        escaped = true;
        continue;
      }
      if (character !== '"') continue;
      inString = false;
      const token = text.slice(stringStart + 1, i);
      if (depth !== 1 || token !== key) continue;

      let cursor = i + 1;
      while (cursor < text.length && /\s/.test(text[cursor])) cursor += 1;
      if (text[cursor] !== ':') continue;
      cursor += 1;
      while (cursor < text.length && /\s/.test(text[cursor])) cursor += 1;
      if (text[cursor] !== '"') {
        throw new Error(`${context}: ${key} must be a string`);
      }
      const valueStart = cursor + 1;
      cursor += 1;
      let valueEscaped = false;
      while (cursor < text.length) {
        const valueCharacter = text[cursor];
        if (valueEscaped) {
          valueEscaped = false;
        } else if (valueCharacter === '\\') {
          valueEscaped = true;
        } else if (valueCharacter === '"') {
          break;
        }
        cursor += 1;
      }
      if (cursor >= text.length) throw new Error(`${context}: unterminated string for ${key}`);
      const valueEnd = cursor;
      const currentValue = text.slice(valueStart, valueEnd);
      if (currentValue !== expectedValue) continue;
      if (replaced) throw new Error(`${context}: duplicate top-level ${key}`);

      text = `${text.slice(0, valueStart)}${nextValue}${text.slice(valueEnd)}`;
      i = valueStart + nextValue.length;
      replaced = true;
    } else if (character === '"') {
      inString = true;
      stringStart = i;
    } else if (character === '{') {
      depth += 1;
    } else if (character === '}') {
      depth -= 1;
    }
  }

  if (!replaced) throw new Error(`${context}: top-level ${key}=${expectedValue} not found`);
  return text;
}

function versionUpdates(read) {
  const documents = VERSION_FILES.map((relativePath) => {
    const text = read(relativePath);
    return { relativePath, text, document: JSON.parse(text) };
  });
  const version = documents[0].document.version;
  const parts = parsePatchVersion(version, MANIFEST);
  const nextVersion = `${parts[1]}.${parts[2]}.${BigInt(parts[3]) + 1n}`;

  // Validate every file before writing. Non-marketplace manifests retain their
  // original formatting; marketplace is rewritten from parsed JSON to target
  // exact version paths safely.
  const updates = documents.map(({ relativePath, text, document }) => {
    const versions = (() => {
      if (relativePath !== MARKETPLACE) {
        if (typeof document?.version !== 'string') {
          throw new Error(`${relativePath}: version must be a string`);
        }
        return [document.version];
      }
      const metadataVersion = document?.metadata?.version;
      const plugins = document?.plugins;
      if (!Array.isArray(plugins) || plugins.length !== 1) {
        throw new Error(`${relativePath}: plugins must be an array with exactly one entry`);
      }
      const pluginVersion = plugins[0]?.version;
      if (typeof metadataVersion !== 'string' || typeof pluginVersion !== 'string') {
        throw new Error(`${relativePath}: metadata.version and plugins[0].version must be strings`);
      }
      return [metadataVersion, pluginVersion];
    })();
    if (versions.some((value) => value !== version)) {
      throw new Error(`${relativePath}: versions must match ${version}`);
    }
    let count = 0;
    let contents;
    if (relativePath !== MARKETPLACE) {
      contents = replaceTopLevelStringProperty(text, 'version', version, nextVersion, relativePath);
      count = 1;
    } else {
      const updated = JSON.parse(text);
      updated.metadata.version = nextVersion;
      updated.plugins[0].version = nextVersion;
      const lineEnding = text.includes('\r\n') ? '\r\n' : '\n';
      contents = `${JSON.stringify(updated, null, 2)}${lineEnding}`;
      count = 2;
    }
    if (count !== versions.length) throw new Error(`${relativePath}: unexpected version fields`);

    const written = JSON.parse(contents);
    if (relativePath !== MARKETPLACE) {
      if (written?.version !== nextVersion) throw new Error(`${relativePath}: failed to update version`);
    } else if (written?.metadata?.version !== nextVersion || written?.plugins?.[0]?.version !== nextVersion) {
      throw new Error(`${relativePath}: failed to update marketplace versions`);
    }
    return { relativePath, contents };
  });
  return { version: nextVersion, updates };
}

export function bumpPluginVersion(root) {
  const { version, updates } = versionUpdates((relativePath) =>
    fs.readFileSync(path.join(root, relativePath), 'utf8'));
  for (const { relativePath, contents } of updates) {
    fs.writeFileSync(path.join(root, relativePath), contents);
  }
  return version;
}

const RELEASE_BRANCH = 'toolkit-release/queue';
const BASE_TRAILER = 'Toolkit-Release-Base';
const SOURCE_TRAILER = 'Toolkit-Release-Source-PR';
const SHA = /^[0-9a-f]{40}$/;

function rawGit(root, ...args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function apiJson(github, args, context) {
  const output = github(args);
  try { return JSON.parse(output); } catch { throw new Error(`Invalid JSON from ${context}`); }
}

function pages(github, endpoint) {
  const response = apiJson(github, ['api', '--paginate', '--slurp', endpoint], endpoint);
  if (!Array.isArray(response) || response.some((page) => !Array.isArray(page))) {
    throw new Error(`Invalid paginated response from ${endpoint}`);
  }
  return response.flat();
}

function verifyInstallationAccess(github, repository) {
  const response = apiJson(github, ['api', '--paginate', '--slurp',
    'installation/repositories?per_page=100'], 'installation repositories');
  if (!Array.isArray(response) || response.some((page) => !Array.isArray(page?.repositories)) ||
      !response.some((page) => page.repositories.some((repo) =>
        typeof repo?.full_name === 'string' && repo.full_name.toLowerCase() === repository.toLowerCase()))) {
    throw new Error('Cannot verify installation access to the release repository');
  }
}

function remoteBranch(root) {
  const output = git(root, 'ls-remote', '--heads', 'origin', `refs/heads/${RELEASE_BRANCH}`);
  if (!output) return null;
  const lines = output.split('\n');
  const [sha, ref] = lines[0].split(/\s+/);
  if (lines.length !== 1 || !SHA.test(sha) || ref !== `refs/heads/${RELEASE_BRANCH}`) {
    throw new Error('Ambiguous release branch');
  }
  return sha;
}

function candidate(root, sha, history, minIndex) {
  if (!SHA.test(sha)) throw new Error('Invalid release head SHA');
  const parents = git(root, 'show', '-s', '--format=%P', sha).split(' ');
  const message = rawGit(root, 'show', '-s', '--format=%B', sha);
  const matches = [...message.matchAll(new RegExp(`^${BASE_TRAILER}: ([a-f0-9]{40})$`, 'gm'))];
  const sources = [...message.matchAll(new RegExp(`^${SOURCE_TRAILER}: ([1-9][0-9]*)$`, 'gm'))];
  if (parents.length !== 1 || matches.length !== 1 || parents[0] !== matches[0][1] ||
      sources.length !== 1 || !Number.isSafeInteger(Number(sources[0][1]))) {
    throw new Error(`Invalid release candidate ${sha}: expected one base and one source PR trailer`);
  }
  const base = parents[0];
  const index = history.indexOf(base);
  if (index < minIndex) throw new Error(`Release candidate base ${base} is outside rollout history`);
  const { version, updates } = versionUpdates((file) => rawGit(root, 'show', `${base}:${file}`));
  if (message.split('\n')[0] !== `chore(release): v${version}`) throw new Error('Release candidate subject/version mismatch');
  verifyTreeChange(root, base, sha, updates);
  return { base, index, version, updates, source: Number(sources[0][1]) };
}

function verifyVersions(root, ref, expected) {
  for (const relativePath of VERSION_FILES) {
    if (!git(root, 'ls-tree', ref, '--', relativePath).startsWith('100644 blob ')) {
      throw new Error(`Release ${ref} has invalid file mode in ${relativePath}`);
    }
    const document = JSON.parse(rawGit(root, 'show', `${ref}:${relativePath}`));
    const versions = relativePath === MARKETPLACE
      ? [document?.metadata?.version, ...(Array.isArray(document?.plugins) && document.plugins.length === 1
        ? [document.plugins[0]?.version] : [])]
      : [document?.version];
    if (versions.length !== (relativePath === MARKETPLACE ? 2 : 1) ||
        versions.some((value) => value !== expected)) {
      throw new Error(`Release ${ref} has conflicting version in ${relativePath}`);
    }
  }
}

function verifyTreeChange(root, before, after, updates) {
  const changed = git(root, 'diff', '--name-only', '--no-renames', before, after).split('\n').filter(Boolean).sort();
  const expected = [...VERSION_FILES].sort();
  if (JSON.stringify(changed) !== JSON.stringify(expected)) throw new Error(`Release ${after} changes unexpected files`);
  for (const { relativePath, contents } of updates) {
    for (const ref of [before, after]) {
      if (!git(root, 'ls-tree', ref, '--', relativePath).startsWith('100644 blob ')) {
        throw new Error(`Release ${after} has invalid file mode in ${relativePath}`);
      }
    }
    if (rawGit(root, 'show', `${after}:${relativePath}`) !== contents) {
      throw new Error(`Release ${after} has conflicting contents in ${relativePath}`);
    }
  }
}

function parsePr(pr, repository) {
  if (!pr || !Number.isSafeInteger(pr.number) || pr.number <= 0 ||
      typeof pr.user?.login !== 'string' || typeof pr.head?.ref !== 'string' ||
      typeof pr.base?.ref !== 'string' || !['open', 'closed'].includes(pr.state) ||
      typeof pr.head?.sha !== 'string' || !SHA.test(pr.head.sha) ||
      (pr.merged_at !== null && (typeof pr.merged_at !== 'string' || !Number.isFinite(Date.parse(pr.merged_at))))) {
    throw new Error('Invalid pull request API response');
  }
  return { ...pr, trustedBranch: pr.head.ref === RELEASE_BRANCH && pr.head.repo?.full_name?.toLowerCase() === repository.toLowerCase() };
}

function releaseState(root, prs, rollout, login, repository) {
  const history = git(root, 'rev-list', '--first-parent', '--reverse', 'origin/main').split('\n');
  const startPr = prs.find((pr) => pr.number === rollout);
  if (!startPr || !startPr.merged_at || startPr.base.ref !== 'main' || !SHA.test(startPr.merge_commit_sha || '')) {
    throw new Error('TOOLKIT_RELEASE_ROLLOUT_PR must identify a merged PR targeting main');
  }
  const start = history.indexOf(startPr.merge_commit_sha);
  if (start < 0) throw new Error('Rollout PR merge commit is not on main first-parent history');
  const merged = new Map();
  const numbers = new Set();
  let active = null;
  for (const pr of prs) {
    if (numbers.has(pr.number)) throw new Error(`Duplicate PR #${pr.number}`);
    numbers.add(pr.number);
    const bot = pr.user.login.toLowerCase() === login.toLowerCase();
    if (pr.trustedBranch && !bot) {
      throw new Error(`Release branch PR #${pr.number} has an untrusted author`);
    }
    if (bot && pr.head.ref === RELEASE_BRANCH && !pr.trustedBranch) {
      throw new Error(`Cannot verify release branch repository for PR #${pr.number}`);
    }
    const release = bot && pr.trustedBranch && pr.base.ref === 'main';
    if (pr.state === 'open' && pr.trustedBranch) {
      if (!release || active) throw new Error('Conflicting or multiple active release PRs');
      active = pr;
    }
    if (!pr.merged_at || pr.base.ref !== 'main') continue;
    if (!SHA.test(pr.merge_commit_sha || '')) throw new Error(`PR #${pr.number} has invalid merge commit`);
    const index = history.indexOf(pr.merge_commit_sha);
    if (index < 0) {
      if (Date.parse(pr.merged_at) >= Date.parse(startPr.merged_at)) {
        throw new Error(`PR #${pr.number} merge is not on main first-parent history`);
      }
      continue;
    }
    if (index < start) continue;
    if (!merged.has(index)) merged.set(index, []);
    merged.get(index).push({ pr, release });
  }
  const pending = [];
  const checkpoints = [];
  for (let i = start; i < history.length; i++) {
    const group = merged.get(i) ?? [];
    group.sort((a, b) => Date.parse(a.pr.merged_at) - Date.parse(b.pr.merged_at) || a.pr.number - b.pr.number);
    const rolloutOrder = group.findIndex((item) => item.pr.number === rollout);
    const eligible = i === start ? group.slice(rolloutOrder) : group;
    for (const { pr, release } of eligible) {
      if (!release) { pending.push({ number: pr.number, index: i }); continue; }
      git(root, 'fetch', 'origin', `refs/pull/${pr.number}/head`);
      const data = candidate(root, pr.head.sha, history, start);
      if (data.index >= i) throw new Error(`Release PR #${pr.number} has invalid base`);
      const first = pending.find((source) => source.index <= data.index);
      if (!first || first.number !== data.source) {
        throw new Error(`Release PR #${pr.number} has invalid or already processed source PR #${data.source}`);
      }
      const parent = git(root, 'rev-parse', `${history[i]}^1`);
      if (group.length === 1) verifyTreeChange(root, parent, history[i], data.updates);
      else verifyVersions(root, history[i], data.version);
      checkpoints.push({ commit: history[i], tag: `v${data.version}`, source: data.source });
      pending.splice(pending.indexOf(first), 1);
    }
  }
  return { history, start, pending, checkpoints, active };
}

function deterministicBundle(root) {
  const stage = path.join(root, '.m365-bundle-stage');
  const files = [];
  function collect(directory, relative = '') {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const name = relative ? `${relative}/${entry.name}` : entry.name;
      if (/[\r\n]/.test(name)) throw new Error('Bundle contains a filename with a newline');
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) collect(absolute, name);
      else if (entry.isFile()) {
        fs.utimesSync(absolute, new Date('2000-01-01T00:00:00Z'), new Date('2000-01-01T00:00:00Z'));
        files.push(name);
      } else throw new Error(`Unsupported bundle entry ${name}`);
    }
  }
  collect(stage);
  if (!files.length) throw new Error('Bundle is empty');
  const asset = path.join(root, ASSET);
  fs.rmSync(asset, { force: true });
  execFileSync('zip', ['-X', '-q', asset, '-@'], {
    cwd: stage, input: `${files.sort().join('\n')}\n`, env: { ...process.env, TZ: 'UTC' }
  });
  return asset;
}

function publish(root, repository, checkpoint, existing, github, login) {
  const { commit, tag } = checkpoint;
  if (existing && (existing.author?.login?.toLowerCase() !== login.toLowerCase() || existing.tag_name !== tag)) {
    throw new Error(`Conflicting release ${tag}`);
  }
  const remote = remoteTagCommit(root, tag);
  if (remote && remote !== commit) throw new Error(`Conflicting remote tag ${tag}`);
  if (!remote && existing) throw new Error(`Existing release ${tag} has no matching tag`);
  if (!remote) git(root, 'push', 'origin', `${commit}:refs/tags/${tag}`);
  if (remoteTagCommit(root, tag) !== commit) throw new Error(`Tag ${tag} does not point to release commit`);
  git(root, 'checkout', '--detach', commit);
  cleanupReleaseArtifacts(root);
  try {
    execFileSync(process.execPath, ['scripts/build-m365-bundle.mjs'], { cwd: root, stdio: 'inherit' });
    const asset = deterministicBundle(root);
    const contents = fs.readFileSync(asset);
    if (!contents.length) throw new Error(`Empty ${ASSET}`);
    if (existing && !Array.isArray(existing.assets)) throw new Error(`Invalid assets for ${tag}`);
    const matching = (existing?.assets ?? []).filter((item) => item?.name === ASSET);
    if (matching.length > 1) throw new Error(`Conflicting assets for ${tag}`);
    if (matching.length && matching[0].size !== contents.length) {
      throw new Error(`Conflicting or unverifiable asset for ${tag}`);
    }
    if (!existing) {
      github(['release', 'create', tag, '--repo', repository, '--verify-tag', '--draft', '--title', tag, '--generate-notes']);
      const created = apiJson(github, ['api', `repos/${repository}/releases/tags/${tag}`], `release ${tag}`);
      if (created?.tag_name !== tag || created?.author?.login?.toLowerCase() !== login.toLowerCase() || created.draft !== true) {
        throw new Error(`Conflicting release ${tag}`);
      }
    }
    if (!matching.length) github(['release', 'upload', tag, asset, '--repo', repository]);
    if (!existing || existing.draft) github(['release', 'edit', tag, '--repo', repository, '--draft=false']);
  } finally {
    cleanupReleaseArtifacts(root);
    git(root, 'reset', '--hard', '--quiet');
    const dirty = git(root, 'status', '--porcelain');
    if (dirty) throw new Error(`Release build left unexpected workspace changes:\n${dirty}`);
  }
}

export function releaseToolkit({
  root = ROOT, repository = process.env.GITHUB_REPOSITORY,
  github,
  token = process.env.GH_TOKEN, login = process.env.TOOLKIT_RELEASE_BOT_LOGIN,
  rollout = process.env.TOOLKIT_RELEASE_ROLLOUT_PR
} = {}) {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository || '')) throw new Error('GITHUB_REPOSITORY must be owner/repository');
  if (!token || !token.trim()) throw new Error('GH_TOKEN is required (supply the release App installation token)');
  const githubClient = github ?? ((args) => runGitHubCli(root, args, { GH_TOKEN: token }));
  if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\[bot\])?$/.test(login || '')) throw new Error('TOOLKIT_RELEASE_BOT_LOGIN is required');
  if (!/^[1-9][0-9]*$/.test(String(rollout || '')) || !Number.isSafeInteger(Number(rollout))) throw new Error('TOOLKIT_RELEASE_ROLLOUT_PR must be a positive PR number');
  const dirty = git(root, 'status', '--porcelain');
  if (dirty) throw new Error(`Release checkout has uncommitted changes:\n${dirty}`);
  const startHead = git(root, 'rev-parse', '--verify', 'HEAD');
  let startBranch = null;
  try { startBranch = git(root, 'symbolic-ref', '--quiet', '--short', 'HEAD'); } catch { /* detached */ }
  try {
    fetchMainAndTags(root);
    const prs = pages(githubClient, `repos/${repository}/pulls?state=all&per_page=100`).map((pr) => parsePr(pr, repository));
    const state = releaseState(root, prs, Number(rollout), login, repository);
    // The trusted workflow must derive the login from the same App that
    // minted GH_TOKEN; this read only confirms the token can access the repo.
    verifyInstallationAccess(githubClient, repository);
    const rules = pages(githubClient, `repos/${repository}/rules/branches/main?per_page=100`);
    if (!rules.some((rule) => rule?.type === 'merge_queue')) {
      throw new Error('Main does not have an effective merge queue rule; refusing to merge');
    }
    const releases = pages(githubClient, `repos/${repository}/releases?per_page=100`);
    const byTag = new Map();
    for (const release of releases) {
      if (!release || typeof release.tag_name !== 'string' || byTag.has(release.tag_name)) throw new Error('Invalid or duplicate release response');
      byTag.set(release.tag_name, release);
    }
    for (const checkpoint of state.checkpoints) publish(root, repository, checkpoint, byTag.get(checkpoint.tag), githubClient, login);
    let head = remoteBranch(root);
    if (head) {
      git(root, 'fetch', 'origin', `refs/heads/${RELEASE_BRANCH}`);
      const data = candidate(root, head, state.history, state.start);
      if (!state.pending.some((source) => source.number === data.source && source.index <= data.index)) {
        if (state.active) throw new Error('Active release PR has no unprocessed sources');
        // A merged PR may leave its branch behind. Never delete or overwrite it
        // without first verifying it is the already merged head.
        if (!prs.some((pr) => pr.merged_at && pr.user.login.toLowerCase() === login.toLowerCase() && pr.trustedBranch && pr.head.sha === head)) {
          throw new Error('Orphan release branch does not match a checkpoint');
        }
        if (!state.pending.length) return;
      }
      if (state.active && state.active.head.sha !== head) throw new Error('Release PR head does not match remote branch');
      if (state.active && state.pending[0]?.number !== data.source) {
        throw new Error('Active release PR does not target the next pending source');
      }
    } else if (state.active) throw new Error('Active release PR branch is missing');
    if (!state.pending.length) return;
    const base = git(root, 'rev-parse', 'origin/main');
    const planned = versionUpdates((file) => rawGit(root, 'show', `${base}:${file}`));
    if (remoteTagCommit(root, `v${planned.version}`) || byTag.has(`v${planned.version}`)) {
      throw new Error(`Conflicting existing tag or release v${planned.version}`);
    }
    let refresh = !head;
    if (head) {
      const data = candidate(root, head, state.history, state.start);
      const current = versionUpdates((file) => rawGit(root, 'show', `${base}:${file}`));
      refresh = JSON.stringify(current.updates) !== JSON.stringify(data.updates) ||
        data.source !== state.pending[0].number;
    }
    if (refresh) {
      git(root, 'checkout', '--detach', base);
      const version = bumpPluginVersion(root);
      git(root, 'add', '--', ...VERSION_FILES);
      git(root, '-c', `user.name=${login}`, '-c', 'user.email=release-bot@users.noreply.github.com', 'commit',
        '-m', `chore(release): v${version}`, '-m', `${BASE_TRAILER}: ${base}\n${SOURCE_TRAILER}: ${state.pending[0].number}`);
      const next = git(root, 'rev-parse', 'HEAD');
      const lease = `--force-with-lease=refs/heads/${RELEASE_BRANCH}:${head || ''}`;
      git(root, 'push', lease, 'origin', `${next}:refs/heads/${RELEASE_BRANCH}`);
      head = next;
    }
    let number = state.active?.number;
    if (!number) {
      githubClient(['pr', 'create', '--repo', repository, '--base', 'main', '--head', RELEASE_BRANCH, '--title', 'chore(release): automated toolkit release', '--body', 'Automated toolkit release.']);
      // Creation can succeed even if its response is lost. Discover the PR by
      // trusted identity and exact head on every retry.
      const updated = pages(githubClient, `repos/${repository}/pulls?state=open&per_page=100`).map((pr) => parsePr(pr, repository));
      const matches = updated.filter((pr) => pr.trustedBranch && pr.base.ref === 'main' && pr.user.login.toLowerCase() === login.toLowerCase() && pr.head.sha === head);
      if (matches.length !== 1) throw new Error('Could not uniquely verify created release PR');
      number = matches[0].number;
    }
    githubClient(['pr', 'merge', String(number), '--repo', repository, '--auto', '--match-head-commit', head]);
  } finally {
    checkoutRef(root, startBranch, startHead);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { releaseToolkit(); } catch (error) {
    console.error(error?.stack ?? error?.message ?? String(error));
    process.exitCode = 1;
  }
}
