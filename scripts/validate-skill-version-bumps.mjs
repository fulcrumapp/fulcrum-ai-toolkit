#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
let YAML;
try {
  YAML = require('../tools/format-validator/node_modules/yaml');
} catch {
  console.error('Missing validator dependencies. Run `npm ci` in tools/format-validator first.');
  process.exit(1);
}

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(process.env.FULCRUM_SKILL_VERSION_ROOT || path.join(SCRIPT_DIR, '..'));
const BASE_REF = process.env.FULCRUM_SKILL_VERSION_BASE;
const SKILLS_PREFIX = 'plugins/fulcrum-ai-toolkit/skills/';

if (!BASE_REF) {
  console.error('Set FULCRUM_SKILL_VERSION_BASE to the comparison base revision.');
  process.exit(1);
}

const changedResult = spawnSync(
  'git',
  ['diff', '--name-status', '-M', '--diff-filter=ACMRTD', '-z', `${BASE_REF}...HEAD`],
  { cwd: ROOT, encoding: 'utf8' }
);

if (changedResult.error || changedResult.status !== 0) {
  console.error(
    `Unable to compare skills against ${BASE_REF}: ${changedResult.error?.message || changedResult.stderr.trim()}`
  );
  process.exit(1);
}

const changedSkillNames = new Set();
const skillChangesByName = new Map();
const baseSkillPathsByName = new Map();
const failures = [];
let migrationBaselines = 0;
const changedPaths = changedResult.stdout.split('\0');
const changeRecords = [];
for (let index = 0; index < changedPaths.length;) {
  const status = changedPaths[index++];
  if (!status) continue;

  const isRename = status.startsWith('R') || status.startsWith('C');
  const firstPath = changedPaths[index++];
  const oldPath = isRename || status === 'D' ? firstPath : null;
  const currentPath = isRename ? changedPaths[index++] : status === 'D' ? null : firstPath;
  const change = { status, oldPath, currentPath };
  changeRecords.push(change);

  const currentSkillName = skillNameFromPath(currentPath);
  const oldSkillName = skillNameFromPath(oldPath);
  if (currentSkillName) {
    changedSkillNames.add(currentSkillName);
    const skillChanges = skillChangesByName.get(currentSkillName) || [];
    skillChanges.push(change);
    skillChangesByName.set(currentSkillName, skillChanges);
  } else if (oldSkillName) {
    changedSkillNames.add(oldSkillName);
  }

  if (
    isRename &&
    oldPath?.endsWith('/SKILL.md') &&
    currentPath?.endsWith('/SKILL.md') &&
    currentSkillName
  ) {
    baseSkillPathsByName.set(currentSkillName, oldPath);
  }
}

const addedSkillsByIdentity = new Map();
for (const change of changeRecords) {
  const skillName = skillNameFromPath(change.currentPath);
  if (change.status !== 'A' || !skillName || !change.currentPath.endsWith('/SKILL.md')) continue;

  const currentPath = path.join(ROOT, change.currentPath);
  const current = readSkillVersion(fs.readFileSync(currentPath, 'utf8'));
  if (current.error || !current.name) continue;

  const addedSkills = addedSkillsByIdentity.get(current.name) || [];
  addedSkills.push({ path: change.currentPath, skillName });
  addedSkillsByIdentity.set(current.name, addedSkills);
}

const deletedSkillsByIdentity = new Map();
if (addedSkillsByIdentity.size > 0) {
  for (const change of changeRecords) {
    if (
      change.status !== 'D' ||
      !change.oldPath?.endsWith('/SKILL.md') ||
      !/(?:^|\/)skills\/[^/]+\/SKILL\.md$/.test(change.oldPath)
    ) {
      continue;
    }

    const baseResult = spawnSync('git', ['show', `${BASE_REF}:${change.oldPath}`], {
      cwd: ROOT,
      encoding: 'utf8'
    });
    if (baseResult.error || baseResult.status !== 0) {
      failures.push(
        `${change.oldPath}: unable to read the deleted base skill (${baseResult.error?.message || baseResult.stderr.trim()})`
      );
      continue;
    }

    const base = readSkillVersion(baseResult.stdout);
    if (base.error) {
      failures.push(`${change.oldPath}: deleted base skill has invalid frontmatter (${base.error})`);
      continue;
    }
    if (!base.name) continue;

    const deletedSkills = deletedSkillsByIdentity.get(base.name) || [];
    deletedSkills.push(change.oldPath);
    deletedSkillsByIdentity.set(base.name, deletedSkills);
  }

  for (const [identity, deletedSkills] of deletedSkillsByIdentity) {
    const addedSkills = addedSkillsByIdentity.get(identity) || [];
    if (addedSkills.length === 0) continue;
    if (deletedSkills.length !== 1 || addedSkills.length !== 1) {
      failures.push(`${identity}: unable to unambiguously match the moved skill by frontmatter name`);
      continue;
    }

    const [{ skillName }] = addedSkills;
    if (!baseSkillPathsByName.has(skillName)) {
      baseSkillPathsByName.set(skillName, deletedSkills[0]);
    }
  }
}

const movedSkillNamesByBaseDirectory = new Map();
for (const [skillName, baseSkillPath] of baseSkillPathsByName) {
  const baseDirectory = skillDirectoryPath(baseSkillPath);
  const currentDirectory = `${SKILLS_PREFIX}${skillName}`;
  if (baseDirectory !== currentDirectory) {
    movedSkillNamesByBaseDirectory.set(baseDirectory, skillName);
  }
}
for (const change of changeRecords) {
  if (change.currentPath || !change.oldPath) continue;
  const movedSkillName = movedSkillNamesByBaseDirectory.get(skillDirectoryPath(change.oldPath));
  if (!movedSkillName) continue;

  const skillChanges = skillChangesByName.get(movedSkillName) || [];
  skillChanges.push(change);
  skillChangesByName.set(movedSkillName, skillChanges);
}

for (const skillName of [...changedSkillNames].sort()) {
  const skillPath = `${SKILLS_PREFIX}${skillName}/SKILL.md`;
  const currentSkillPath = path.join(ROOT, skillPath);
  if (!fs.existsSync(currentSkillPath)) continue;

  const current = readSkillVersion(fs.readFileSync(currentSkillPath, 'utf8'));
  if (current.error || !current.hasVersion || !parseSemver(current.version)) {
    failures.push(`${skillPath}: metadata.version must be stable SemVer in MAJOR.MINOR.PATCH form`);
    continue;
  }

  const baseSkillPath = baseSkillPathsByName.get(skillName) || skillPath;
  const basePathResult = spawnSync('git', ['ls-tree', '-z', BASE_REF, '--', baseSkillPath], {
    cwd: ROOT,
    encoding: 'utf8'
  });
  if (basePathResult.error || basePathResult.status !== 0) {
    failures.push(
      `${skillPath}: unable to inspect the base skill (${basePathResult.error?.message || basePathResult.stderr.trim()})`
    );
    continue;
  }
  if (basePathResult.stdout.length === 0) {
    if (current.version !== '1.0.0') {
      failures.push(`${skillPath}: new skills must start at 1.0.0; found ${current.version}`);
    }
    continue;
  }

  const baseResult = spawnSync('git', ['show', `${BASE_REF}:${baseSkillPath}`], {
    cwd: ROOT,
    encoding: 'utf8'
  });
  if (baseResult.error || baseResult.status !== 0) {
    failures.push(
      `${skillPath}: unable to read the base version (${baseResult.error?.message || baseResult.stderr.trim()})`
    );
    continue;
  }

  const base = readSkillVersion(baseResult.stdout);
  if (base.error) {
    failures.push(`${skillPath}: base SKILL.md has invalid frontmatter (${base.error})`);
    continue;
  }
  if (!base.hasVersion) {
    migrationBaselines += 1;
    continue;
  }
  if (!parseSemver(base.version)) {
    failures.push(`${skillPath}: base metadata.version is not stable SemVer (${base.version})`);
    continue;
  }
  const comparison = compareSemver(current.version, base.version);
  const locationOnlyMove = isLocationOnlyMove(
    skillChangesByName.get(skillName) || [],
    baseSkillPath,
    skillPath
  );
  if (comparison < 0 || (comparison === 0 && !locationOnlyMove)) {
    failures.push(`${skillPath}: version must increase above ${base.version}; found ${current.version}`);
  }
}

if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'));
  process.exit(1);
}

console.log(
  `Skill version check passed for ${changedSkillNames.size} changed skill(s)` +
    (migrationBaselines ? `; ${migrationBaselines} unversioned base skill(s) initialized` : '') +
    '.'
);

function skillNameFromPath(relativePath) {
  if (!relativePath) return null;
  return relativePath.match(/^plugins\/fulcrum-ai-toolkit\/skills\/([^/]+)\//)?.[1] || null;
}

function skillDirectoryPath(relativePath) {
  const match = relativePath.match(/^(.*?\/skills\/[^/]+)(?:\/|$)/);
  return match ? match[1] : path.posix.dirname(relativePath);
}

function isLocationOnlyMove(changes, baseSkillPath, currentSkillPath) {
  const baseDirectory = skillDirectoryPath(baseSkillPath);
  const currentDirectory = skillDirectoryPath(currentSkillPath);
  return (
    baseDirectory !== currentDirectory &&
    changes.length > 0 &&
    changes.every(
      ({ status, oldPath, currentPath }) =>
        status === 'R100' &&
        oldPath &&
        currentPath &&
        skillDirectoryPath(oldPath) === baseDirectory &&
        skillDirectoryPath(currentPath) === currentDirectory
    )
  );
}

function readSkillVersion(text) {
  const match = text.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n|$)/);
  if (!match) return { error: 'missing YAML frontmatter', hasVersion: false, version: null, name: null };

  let frontmatter;
  try {
    frontmatter = YAML.parse(match[1]);
  } catch (error) {
    return { error: error.message.split('\n')[0].trim(), hasVersion: false, version: null, name: null };
  }

  if (!frontmatter || typeof frontmatter !== 'object' || Array.isArray(frontmatter)) {
    return { error: 'frontmatter must be a mapping', hasVersion: false, version: null, name: null };
  }
  const name = typeof frontmatter.name === 'string' ? frontmatter.name : null;
  if (!Object.hasOwn(frontmatter, 'metadata')) {
    return { error: null, hasVersion: false, version: null, name };
  }

  const metadata = frontmatter.metadata;
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return { error: 'metadata must be a mapping', hasVersion: false, version: null, name };
  }
  if (!Object.hasOwn(metadata, 'version')) {
    return { error: null, hasVersion: false, version: null, name };
  }
  return { error: null, hasVersion: true, version: metadata.version, name };
}

function parseSemver(value) {
  if (typeof value !== 'string') return null;
  const match = value.match(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/);
  return match ? match.slice(1).map(BigInt) : null;
}

function compareSemver(left, right) {
  const leftParts = parseSemver(left);
  const rightParts = parseSemver(right);
  if (!leftParts || !rightParts) return Number.NaN;

  for (let index = 0; index < leftParts.length; index += 1) {
    if (leftParts[index] > rightParts[index]) return 1;
    if (leftParts[index] < rightParts[index]) return -1;
  }
  return 0;
}
