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
  ['diff', '--name-only', '--diff-filter=ACMRTD', `${BASE_REF}...HEAD`],
  { cwd: ROOT, encoding: 'utf8' }
);

if (changedResult.error || changedResult.status !== 0) {
  console.error(
    `Unable to compare skills against ${BASE_REF}: ${changedResult.error?.message || changedResult.stderr.trim()}`
  );
  process.exit(1);
}

const changedSkillNames = new Set();
for (const relativePath of changedResult.stdout.split('\n').filter(Boolean)) {
  const match = relativePath.match(/^plugins\/fulcrum-ai-toolkit\/skills\/([^/]+)\//);
  if (match) changedSkillNames.add(match[1]);
}

const failures = [];
let migrationBaselines = 0;

for (const skillName of [...changedSkillNames].sort()) {
  const skillPath = `${SKILLS_PREFIX}${skillName}/SKILL.md`;
  const currentSkillPath = path.join(ROOT, skillPath);
  if (!fs.existsSync(currentSkillPath)) continue;

  const current = readSkillVersion(fs.readFileSync(currentSkillPath, 'utf8'));
  if (current.error || !current.hasVersion || !parseSemver(current.version)) {
    failures.push(`${skillPath}: metadata.version must be stable SemVer in MAJOR.MINOR.PATCH form`);
    continue;
  }

  const baseResult = spawnSync('git', ['show', `${BASE_REF}:${skillPath}`], {
    cwd: ROOT,
    encoding: 'utf8'
  });
  if (baseResult.error) {
    failures.push(`${skillPath}: unable to read the base version (${baseResult.error.message})`);
    continue;
  }
  if (baseResult.status !== 0) continue;

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
  if (compareSemver(current.version, base.version) <= 0) {
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

function readSkillVersion(text) {
  const match = text.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n|$)/);
  if (!match) return { error: 'missing YAML frontmatter', hasVersion: false, version: null };

  let frontmatter;
  try {
    frontmatter = YAML.parse(match[1]);
  } catch (error) {
    return { error: error.message.split('\n')[0].trim(), hasVersion: false, version: null };
  }

  if (!frontmatter || typeof frontmatter !== 'object' || Array.isArray(frontmatter)) {
    return { error: 'frontmatter must be a mapping', hasVersion: false, version: null };
  }
  if (!Object.hasOwn(frontmatter, 'metadata')) {
    return { error: null, hasVersion: false, version: null };
  }

  const metadata = frontmatter.metadata;
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return { error: 'metadata must be a mapping', hasVersion: false, version: null };
  }
  if (!Object.hasOwn(metadata, 'version')) {
    return { error: null, hasVersion: false, version: null };
  }
  return { error: null, hasVersion: true, version: metadata.version };
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
