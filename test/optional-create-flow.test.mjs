import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const skillDir = path.join(root, 'optional-skills/create-flow');
const require = createRequire(import.meta.url);
const YAML = require('../tools/format-validator/node_modules/yaml');

test('optional create-flow requires explicit invocation and retains its companion files', () => {
  const text = fs.readFileSync(path.join(skillDir, 'SKILL.md'), 'utf8');
  const frontmatter = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  assert.ok(frontmatter);
  const metadata = YAML.parse(frontmatter[1]);
  assert.equal(metadata.name, 'create-flow');
  assert.match(metadata.metadata.version, /^\d+\.\d+\.\d+$/);
  assert.equal(metadata['disable-model-invocation'], true);
  assert.equal(
    YAML.parse(fs.readFileSync(path.join(skillDir, 'agents/openai.yaml'), 'utf8'))
      .policy.allow_implicit_invocation,
    false
  );
  assert.match(text, /This is experimental, do not use unless you are completely sure what you doing/);
  assert.match(text, /only when the user explicitly requests `create-flow`/);

  for (const relativePath of [
    'README.md',
    'resources/runtime-contract.md',
    'resources/data-events.md',
    'examples/read-editor.js'
  ]) {
    assert.ok(fs.existsSync(path.join(skillDir, relativePath)), relativePath);
  }
  assert.equal(fs.existsSync(path.join(skillDir, 'examples/signature-stamp.js')), false);
  assert.equal(fs.existsSync(path.join(root, 'plugins/fulcrum-ai-toolkit/skills/create-flow')), false);
});

test('optional skill relative file links remain within the skill and resolve', () => {
  for (const relativePath of ['SKILL.md', 'README.md', 'resources/runtime-contract.md', 'resources/data-events.md']) {
    const file = path.join(skillDir, relativePath);
    const text = fs.readFileSync(file, 'utf8');
    for (const match of text.matchAll(/\]\(([^)]+)\)/g)) {
      const target = match[1].split('#')[0];
      if (!target || /^[a-z]+:\/\//i.test(target)) continue;
      const resolved = path.resolve(path.dirname(file), target);
      assert.ok(resolved.startsWith(`${skillDir}${path.sep}`), `${relativePath}: ${target}`);
      assert.ok(fs.existsSync(resolved), `${relativePath}: ${target}`);
    }
  }
});
