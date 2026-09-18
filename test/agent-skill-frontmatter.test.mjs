import assert from 'node:assert/strict';
import test from 'node:test';
import { validateAgentSkillFrontmatter } from '../scripts/agent-skill-frontmatter.mjs';

const validFrontmatter = {
  name: 'example-skill',
  description: 'Use this skill when working on example tasks.',
  license: 'MIT',
  compatibility: 'Requires a host with Agent Skills support.',
  metadata: {
    author: 'example-org',
    version: '1.0'
  },
  'allowed-tools': 'Read Bash(git:*)'
};

function errors(frontmatter = validFrontmatter, directoryName = 'example-skill') {
  return validateAgentSkillFrontmatter(frontmatter, 'skills/example-skill/SKILL.md', directoryName);
}

test('accepts conformant Agent Skills frontmatter', () => {
  assert.deepEqual(errors(), []);
});

test('rejects missing and mistyped required fields', () => {
  const failures = errors({
    name: ['example-skill'],
    description: { text: 'invalid' },
    metadata: ['invalid'],
    'allowed-tools': { Read: true }
  });

  assert.ok(failures.some((failure) => failure.includes('name must be a non-empty string')));
  assert.ok(failures.some((failure) => failure.includes('description must be a non-empty string')));
  assert.ok(failures.some((failure) => failure.includes('metadata must be a mapping')));
  assert.ok(failures.some((failure) => failure.includes('allowed-tools must be a space-separated string')));
});

test('rejects Agent Skills name syntax and length violations', () => {
  assert.ok(errors({ ...validFrontmatter, name: 'Example--Skill' }).some((failure) => failure.includes('name must be 1-64')));
  assert.ok(errors({ ...validFrontmatter, name: `a${'b'.repeat(64)}` }).some((failure) => failure.includes('name must be 1-64')));
  assert.ok(errors({ ...validFrontmatter }, 'different-directory').some((failure) => failure.includes('name does not match directory')));
});

test('rejects description and compatibility length violations', () => {
  assert.ok(errors({ ...validFrontmatter, description: 'x'.repeat(1025) }).some((failure) => failure.includes('description must be at most 1024')));
  assert.ok(errors({ ...validFrontmatter, compatibility: 'x'.repeat(501) }).some((failure) => failure.includes('compatibility must be at most 500')));
});

test('rejects non-string metadata values and optional fields', () => {
  const failures = errors({
    ...validFrontmatter,
    license: 1,
    compatibility: true,
    metadata: { version: 1 },
    'allowed-tools': false
  });

  assert.ok(failures.some((failure) => failure.includes('license must be a string')));
  assert.ok(failures.some((failure) => failure.includes('compatibility must be a non-empty string')));
  assert.ok(failures.some((failure) => failure.includes('metadata value for "version" must be a string')));
  assert.ok(failures.some((failure) => failure.includes('allowed-tools must be a space-separated string')));
});

test('rejects unknown frontmatter fields', () => {
  assert.ok(errors({ ...validFrontmatter, 'disable-model-invocation': true }).some((failure) => failure.includes('unsupported Agent Skills frontmatter field')));
});
