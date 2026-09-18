import assert from 'node:assert/strict';
import test from 'node:test';
import { validateAgentPluginManifest } from '../scripts/agent-plugin-manifest.mjs';

const validManifest = {
  $schema: 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json',
  name: 'example-plugin',
  version: '1.0.0',
  description: 'An example plugin.',
  author: { name: 'Example' },
  homepage: 'https://example.com',
  repository: 'https://github.com/example/plugin',
  license: 'MIT',
  keywords: ['example'],
  extensions: {
    'com.example.client': { setting: true }
  }
};

function errors(manifest = validManifest) {
  return validateAgentPluginManifest(manifest, 'plugins/example/plugin.json');
}

test('accepts a conformant Agent Plugins manifest', () => {
  assert.deepEqual(errors(), []);
});

test('rejects missing schema and unknown top-level fields', () => {
  const withoutSchema = { ...validManifest };
  delete withoutSchema.$schema;
  const failures = errors({ ...withoutSchema, unsupported: true });

  assert.ok(failures.some((failure) => failure.includes('$schema must identify Agent Plugins 1.0.0')));
  assert.ok(failures.some((failure) => failure.includes('unsupported top-level field "unsupported"')));
});

test('rejects malformed author and extension values', () => {
  const failures = errors({
    ...validManifest,
    author: ['invalid'],
    extensions: {
      cursor: {},
      'com.example.client': []
    }
  });

  assert.ok(failures.some((failure) => failure.includes('author must be an object')));
  assert.ok(failures.some((failure) => failure.includes('extension key "cursor" must be a reverse-domain namespace')));
  assert.ok(failures.some((failure) => failure.includes('extension "com.example.client" must be an object')));
});

test('rejects malformed manifest value types and names', () => {
  const failures = errors({
    ...validManifest,
    name: 'Bad..Name',
    version: 1,
    keywords: ['valid', 2]
  });

  assert.ok(failures.some((failure) => failure.includes('name does not satisfy Agent Plugins naming constraints')));
  assert.ok(failures.some((failure) => failure.includes('version must be a string')));
  assert.ok(failures.some((failure) => failure.includes('keywords must be an array of strings')));
});
