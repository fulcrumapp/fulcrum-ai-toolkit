import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const require = createRequire(import.meta.url);
const YAML = require('../tools/format-validator/node_modules/yaml');
const workflow = YAML.parse(fs.readFileSync(new URL('../.github/workflows/validate.yml', import.meta.url), 'utf8'));
const testCommands = workflow.jobs.validate.steps
  .map((step) => step.run)
  .filter((command) => command?.startsWith('node --test '));
const [testCommand] = testCommands;

test('CI and contributor guidance use top-level test discovery instead of suite lists', () => {
  assert.deepEqual(testCommands, ['node --test test/*.test.mjs']);
  const readme = fs.readFileSync(new URL('../README.md', import.meta.url), 'utf8');
  const localValidation = readme.split('## Local validation\n')[1]?.split('\n## ')[0];
  assert.ok(localValidation, 'Missing local validation guidance');
  const documentedCommands = localValidation.split('\n')
    .filter((line) => line.startsWith('node --test '));
  assert.deepEqual(documentedCommands, testCommands);
});

test('the owning CI command discovers new suites, excludes fixtures, and propagates failures', (t) => {
  assert.equal(testCommand, 'node --test test/*.test.mjs');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'toolkit-test-discovery-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const testDir = path.join(root, 'test');
  const fixturesDir = path.join(testDir, 'fixtures');
  fs.mkdirSync(fixturesDir, { recursive: true });
  fs.writeFileSync(path.join(testDir, 'new-suite.test.mjs'), `
import test from 'node:test';
test('newly added suite ran', () => {});
`);
  fs.writeFileSync(path.join(testDir, 'helper.mjs'), "throw new Error('non-test helper executed');\n");
  fs.writeFileSync(path.join(fixturesDir, 'nested.test.mjs'), "throw new Error('nested fixture executed');\n");

  const env = {
    ...process.env,
    PATH: `${path.dirname(process.execPath)}${path.delimiter}${process.env.PATH}`
  };
  // Run a standalone CLI rather than inheriting this test runner's child context.
  delete env.NODE_TEST_CONTEXT;
  const run = () => spawnSync('bash', ['-c', testCommand], {
    cwd: root,
    env,
    encoding: 'utf8'
  });
  const passing = run();
  assert.equal(passing.status, 0, passing.stderr || passing.stdout);
  assert.match(passing.stdout, /newly added suite ran/);

  fs.writeFileSync(path.join(testDir, 'failing-suite.test.mjs'), `
import test from 'node:test';
test('new suite failure is visible', () => { throw new Error('discovery failure probe'); });
`);
  const failing = run();
  assert.equal(failing.status, 1, failing.stderr || failing.stdout);
  assert.match(failing.stdout, /newly added suite ran/);
  assert.match(failing.stdout, /discovery failure probe/);
});
