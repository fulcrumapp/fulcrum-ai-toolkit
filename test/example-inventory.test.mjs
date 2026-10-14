import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { validateExampleBlockInventory } from '../scripts/example-inventory.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('example inventory validates report fingerprints and legacy coverage', () => {
  assert.deepEqual(validateExampleBlockInventory(ROOT), []);
});
