#!/usr/bin/env node

import { execFileSync, spawnSync } from 'node:child_process';
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
const SOURCE_TRAILER = 'Toolkit-Release-Source';
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

function git(root, ...args) {
  return execFileSync('git', args, {
    cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']
  }).trim();
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

export function bumpPluginVersion(root) {
  const documents = VERSION_FILES.map((relativePath) => {
    const text = fs.readFileSync(path.join(root, relativePath), 'utf8');
    return { relativePath, text, document: JSON.parse(text) };
  });
  const version = documents[0].document.version;
  const parts = parsePatchVersion(version, MANIFEST);
  const nextVersion = `${parts[1]}.${parts[2]}.${BigInt(parts[3]) + 1n}`;

  // Validate every file before writing, preserving each manifest's formatting.
  const updates = documents.map(({ relativePath, text, document }) => {
    const versions = relativePath === MARKETPLACE
      ? [document.metadata?.version, document.plugins?.[0]?.version]
      : [document.version];
    if (versions.some((value) => value !== version)) {
      throw new Error(`${relativePath}: versions must match ${version}`);
    }
    let count = 0;
    const contents = text.replace(/("version"\s*:\s*")[^"]*(")/g, (_, before, after) => {
      count += 1;
      return `${before}${nextVersion}${after}`;
    });
    if (count !== versions.length) {
      throw new Error(`${relativePath}: unexpected version fields`);
    }
    return { relativePath, contents };
  });
  for (const { relativePath, contents } of updates) {
    fs.writeFileSync(path.join(root, relativePath), contents);
  }
  return nextVersion;
}

function releaseState(root) {
  const introduction = git(
    root, 'log', '--first-parent', '--reverse', '--diff-filter=A', '--format=%H',
    'origin/main', '--', 'scripts/release-toolkit.mjs'
  ).split('\n')[0];
  if (!introduction) throw new Error('Cannot find release automation introduction on main');

  const history = git(root, 'rev-list', '--first-parent', '--reverse', 'origin/main').split('\n');
  const introductionIndex = history.indexOf(introduction);
  if (introductionIndex < 0) {
    throw new Error(`Release automation introduction ${introduction} is not in origin/main first-parent history`);
  }
  const sources = new Set();
  const checkpoints = [];
  for (const commit of history.slice(introductionIndex)) {
    const message = git(root, 'show', '-s', '--format=%B', commit);
    const source = message.match(/^Toolkit-Release-Source: ([a-f0-9]{40})$/m)?.[1];
    if (!source) {
      sources.add(commit);
      continue;
    }
    const version = JSON.parse(git(root, 'show', `${commit}:${MANIFEST}`)).version;
    parsePatchVersion(version, `${commit}:${MANIFEST}`);
    if (message.split('\n')[0] !== `chore(release): v${version}` || !sources.delete(source)) {
      throw new Error(`Invalid or duplicate release checkpoint: ${commit}`);
    }
    checkpoints.push({ commit, tag: `v${version}`, source });
  }
  return { pending: [...sources], checkpoints };
}

function publish(root, repository, checkpoint, existing, github) {
  const { commit, tag } = checkpoint;
  if (git(root, 'rev-parse', `${tag}^{commit}`) !== commit) {
    throw new Error(`${tag} does not point to release commit ${commit}`);
  }
  const assets = existing?.assets ?? [];
  if (existing && !existing.draft &&
      assets.some((asset) => asset.name === ASSET && asset.size > 0)) {
    console.log(`Release ${tag} is already complete.`);
    return;
  }

  git(root, 'checkout', '--detach', commit);
  const assetPath = path.join(root, ASSET);
  if (fs.existsSync(assetPath)) {
    fs.unlinkSync(assetPath);
  }
  try {
    execFileSync(process.execPath, ['scripts/build-m365-bundle.mjs'], {
      cwd: root, stdio: 'inherit'
    });
    if (!fs.existsSync(assetPath) || fs.statSync(assetPath).size === 0) {
      throw new Error(`Missing or empty ${ASSET}`);
    }
    if (!existing) {
      github([
        'release', 'create', tag, '--repo', repository, '--verify-tag', '--draft',
        '--title', tag, '--generate-notes'
      ]);
    }
    github(['release', 'upload', tag, assetPath, '--repo', repository, '--clobber']);
    github(['release', 'edit', tag, '--repo', repository, '--draft=false']);
    console.log(`Published ${tag} from ${commit}.`);
  } finally {
    git(root, 'reset', '--hard', '--quiet');
  }
}

export function releaseToolkit({
  root = ROOT,
  repository = process.env.GITHUB_REPOSITORY,
  github = (args) => execFileSync('gh', args, { cwd: root, encoding: 'utf8' })
} = {}) {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository || '')) {
    throw new Error('GITHUB_REPOSITORY must be owner/repository');
  }
  if (git(root, 'status', '--porcelain', '--untracked-files=no')) {
    throw new Error('Release checkout has uncommitted tracked changes');
  }
  const startHead = git(root, 'rev-parse', '--verify', 'HEAD');
  let startBranch = null;
  try {
    startBranch = git(root, 'symbolic-ref', '--quiet', '--short', 'HEAD');
  } catch {
    startBranch = null;
  }
  const releases = new Map(JSON.parse(github([
    'api', '--paginate', '--slurp', `repos/${repository}/releases?per_page=100`
  ])).flat().map((release) => [release.tag_name, release]));
  const completed = new Set();
  let pushConflicts = 0;

  try {
    for (;;) {
      git(root, 'fetch', 'origin', 'main', '--tags');
      const { pending, checkpoints } = releaseState(root);
      for (const checkpoint of checkpoints) {
        if (completed.has(checkpoint.commit)) continue;
        publish(root, repository, checkpoint, releases.get(checkpoint.tag), github);
        completed.add(checkpoint.commit);
      }
      if (pending.length === 0) return;

      git(root, 'checkout', '--detach', 'origin/main');
      const base = git(root, 'rev-parse', 'HEAD');
      const version = bumpPluginVersion(root);
      const tag = `v${version}`;
      git(root, 'add', '--', ...VERSION_FILES);
      git(
        root, '-c', 'user.name=github-actions[bot]',
        '-c', 'user.email=41898282+github-actions[bot]@users.noreply.github.com',
        'commit', '-m', `chore(release): ${tag}`,
        '-m', `${SOURCE_TRAILER}: ${pending[0]}`
      );
      const commit = git(root, 'rev-parse', 'HEAD');
      // Publish both refs atomically; a concurrent merge must never leave a stray tag.
      const push = spawnSync(
        'git', ['push', '--atomic', 'origin', `${commit}:refs/heads/main`, `${commit}:refs/tags/${tag}`],
        { cwd: root, encoding: 'utf8' }
      );
      if (push.error) throw push.error;
      if (push.status !== 0) {
        git(root, 'fetch', 'origin', 'main');
        if (git(root, 'rev-parse', 'origin/main') === base || ++pushConflicts >= 5) {
          throw new Error(
            `Cannot push release checkpoint. Check main branch rules and contents:write permission.\n${push.stderr}`
          );
        }
        console.warn('Main advanced during the release push; retrying from the new tip.');
      }
    }
  } finally {
    checkoutRef(root, startBranch, startHead);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    releaseToolkit();
  } catch (error) {
    console.error(error?.stack ?? error?.message ?? String(error));
    process.exitCode = 1;
  }
}
