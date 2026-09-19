import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { assembleGeminiExtension } from '../scripts/build-gemini-extension.mjs';

test('assembles a Gemini-native extension outside the portable package', () => {
  const destination = fs.mkdtempSync(path.join(os.tmpdir(), 'fulcrum-gemini-'));

  try {
    assembleGeminiExtension(destination);
    const manifest = JSON.parse(
      fs.readFileSync(path.join(destination, 'gemini-extension.json'), 'utf8')
    );
    const skillNames = fs.readdirSync(path.join(destination, 'skills')).sort();

    assert.equal(manifest.name, 'fulcrum-ai-toolkit');
    assert.equal(manifest.version, '0.1.2');
    assert.deepEqual(skillNames, [
      'fulcrum-access-management',
      'fulcrum-app-builder',
      'fulcrum-app-design',
      'fulcrum-app-extensions',
      'fulcrum-app-goal',
      'fulcrum-app-scorecard',
      'fulcrum-data-events',
      'fulcrum-data-migration',
      'fulcrum-discovery',
      'fulcrum-gis-mapping',
      'fulcrum-integration-patterns',
      'fulcrum-performance-review',
      'fulcrum-product-knowledge',
      'fulcrum-query-api',
      'fulcrum-report-building',
      'fulcrum-safety',
      'fulcrum-solution-document',
      'fulcrum-workflow-decomposition'
    ]);
    assert.equal(fs.existsSync(path.join(destination, 'plugin.json')), false);
    assert.equal(fs.existsSync(path.join(destination, 'mcp.json')), false);
  } finally {
    fs.rmSync(destination, { recursive: true, force: true });
  }
});
