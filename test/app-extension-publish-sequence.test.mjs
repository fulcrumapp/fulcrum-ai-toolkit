import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const assets = [
  new URL(
    '../plugins/fulcrum-ai-toolkit/skills/fulcrum-app-extensions/assets/app-mcp-extension-publish-sequence.txt',
    import.meta.url
  ),
  new URL(
    '../skills/fulcrum-app-extensions/assets/app-mcp-extension-publish-sequence.txt',
    import.meta.url
  )
];

test('extension publishing assets resolve app-editing safety gates', () => {
  for (const assetUrl of assets) {
    const assetPath = fileURLToPath(assetUrl);
    const content = fs.readFileSync(assetPath, 'utf8');
    const references = content.matchAll(/(\.\.\/)+fulcrum-app-editing\/SKILL\.md/g);
    const editingSkillPath = path.resolve(
      path.dirname(assetPath),
      '../../fulcrum-app-editing/SKILL.md'
    );

    assert.equal([...references].length, 3);
    assert.equal(fs.existsSync(editingSkillPath), true);
    assert.doesNotMatch(
      content,
      /^\s*\.\.\/fulcrum-app-editing\/SKILL\.md/m
    );
  }
});
