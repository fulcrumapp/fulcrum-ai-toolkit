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

function runGitHubCli(root, args) {
  try {
    return execFileSync('gh', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (error) {
    const stderr = error?.stderr?.toString().trim();
    const details = stderr ? `\n${stderr}` : '';
    throw new Error(`gh ${args.join(' ')} failed.${details}`);
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

function tagRefExists(root, tag) {
  const probe = spawnSync('git', ['show-ref', '--verify', '--quiet', `refs/tags/${tag}`], {
    cwd: root,
    stdio: 'ignore'
  });
  if (probe.error) throw probe.error;
  return probe.status === 0;
}

function remoteTagCommit(root, tag) {
  const output = git(root, 'ls-remote', '--tags', 'origin', `refs/tags/${tag}`);
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

function fetchTagRef(root, tag) {
  git(root, 'fetch', 'origin', `+refs/tags/${tag}:refs/tags/${tag}`);
}

function cleanupReleaseArtifacts(root) {
  fs.rmSync(path.join(root, ASSET), { force: true });
  fs.rmSync(path.join(root, '.m365-bundle-stage'), { recursive: true, force: true });
}

function fetchMainAndTags(root) {
  const inGitHubActions = process.env.GITHUB_ACTIONS === 'true';
  if (inGitHubActions) {
    git(root, 'fetch', '--force', '--prune', '--prune-tags', 'origin', 'main', '--tags');
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

export function bumpPluginVersion(root) {
  const documents = VERSION_FILES.map((relativePath) => {
    const text = fs.readFileSync(path.join(root, relativePath), 'utf8');
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
    const source = message.match(new RegExp(`^${SOURCE_TRAILER}: ([a-f0-9]{40})$`, 'm'))?.[1];
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
  const remoteCommit = remoteTagCommit(root, tag);
  if (!remoteCommit) {
    throw new Error(`Missing remote tag ${tag} for release checkpoint commit ${commit}`);
  }
  if (remoteCommit !== commit) {
    throw new Error(`${tag} does not point to release commit ${commit} on origin`);
  }
  fetchTagRef(root, tag);
  if (!tagRefExists(root, tag)) {
    throw new Error(`Missing local tag ${tag} for release checkpoint commit ${commit}`);
  }
  if (git(root, 'rev-parse', `${tag}^{commit}`) !== commit) {
    throw new Error(`${tag} does not point to release commit ${commit}`);
  }
  const assets = existing?.assets ?? [];
  if (existing && !existing.draft &&
      assets.some((asset) => asset.name === ASSET && asset.size > 0)) {
    cleanupReleaseArtifacts(root);
    console.log(`Release ${tag} is already complete.`);
    return;
  }

  git(root, 'checkout', '--detach', commit);
  const assetPath = path.join(root, ASSET);
  cleanupReleaseArtifacts(root);
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
    cleanupReleaseArtifacts(root);
    git(root, 'reset', '--hard', '--quiet');
  }
}

export function releaseToolkit({
  root = ROOT,
  repository = process.env.GITHUB_REPOSITORY,
  github = (args) => runGitHubCli(root, args)
} = {}) {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository || '')) {
    throw new Error('GITHUB_REPOSITORY must be owner/repository');
  }
  if (git(root, 'status', '--porcelain')) {
    throw new Error('Release checkout has uncommitted changes');
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
      fetchMainAndTags(root);
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
        fetchMainAndTags(root);
        if (git(root, 'ls-remote', '--tags', 'origin', `refs/tags/${tag}`)) {
          throw new Error(
            `Cannot push release checkpoint: remote tag ${tag} already exists or is protected.\n${push.stderr}`
          );
        }
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
