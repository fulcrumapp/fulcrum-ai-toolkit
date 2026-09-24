import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { build } from '../scripts/build-m365-bundle.mjs';

function writeFixture(root, relativePath, contents) {
  const filePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents);
}

test('M365 bundle stages root entrypoint, converts resources, rewrites links, and rebuilds cleanly', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fulcrum-m365-bundle-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const packagePath = path.join(root, 'plugins', 'fulcrum-ai-toolkit');
  writeFixture(
    packagePath,
    'SKILL.md',
    '# Fixture bundle\n\n[Template](skills/example/template.ejs)\n[Script](skills/example/helper.js)\n[License](LICENSE)\n'
  );
  writeFixture(packagePath, 'LICENSE', 'Fixture license text.\n');
  writeFixture(packagePath, 'skills/example/SKILL.md', '# Example skill\n');
  writeFixture(packagePath, 'skills/example/template.ejs', '<h1>Fixture</h1>\n');
  writeFixture(packagePath, 'skills/example/theme.css', 'h1 { color: blue; }\n');
  writeFixture(packagePath, 'skills/example/query.sql', 'SELECT 1;\n');
  writeFixture(packagePath, 'skills/example/helper.js', 'const helper = () => 42;\n');
  writeFixture(packagePath, 'skills/example/notes.md', '# Keep Markdown\n');

  build(root);

  const stagePath = path.join(root, '.m365-bundle-stage');
  const stagedEntrypoint = fs.readFileSync(path.join(stagePath, 'SKILL.md'), 'utf8');
  assert.match(stagedEntrypoint, /\]\(skills\/example\/template-ejs\.md\)/);
  assert.match(stagedEntrypoint, /\]\(skills\/example\/helper-js\.md\)/);
  assert.match(stagedEntrypoint, /\]\(LICENSE\.md\)/);
  assert.match(
    fs.readFileSync(path.join(stagePath, 'skills/example/template-ejs.md'), 'utf8'),
    /```html\n<h1>Fixture<\/h1>\n```/
  );
  assert.match(fs.readFileSync(path.join(stagePath, 'skills/example/theme-css.md'), 'utf8'), /```css/);
  assert.match(fs.readFileSync(path.join(stagePath, 'skills/example/query-sql.md'), 'utf8'), /```sql/);
  assert.match(
    fs.readFileSync(path.join(stagePath, 'skills/example/helper-js.md'), 'utf8'),
    /```javascript\nconst helper = \(\) => 42;\n```/
  );
  assert.match(fs.readFileSync(path.join(stagePath, 'LICENSE.md'), 'utf8'), /Fixture license text/);
  assert.equal(fs.readFileSync(path.join(stagePath, 'skills/example/notes.md'), 'utf8'), '# Keep Markdown\n');
  assert.equal(fs.existsSync(path.join(stagePath, 'skills/example/template.ejs')), false);
  assert.equal(fs.existsSync(path.join(stagePath, 'skills/example/helper.js')), false);

  const zipPath = path.join(root, 'fulcrum-ai-toolkit-m365.zip');
  const firstArchiveEntries = execFileSync('unzip', ['-Z1', zipPath], { encoding: 'utf8' })
    .trim()
    .split('\n')
    .sort();
  assert.ok(firstArchiveEntries.includes('SKILL.md'));
  assert.ok(firstArchiveEntries.includes('skills/example/template-ejs.md'));
  assert.ok(firstArchiveEntries.includes('skills/example/helper-js.md'));
  assert.equal(firstArchiveEntries.some((entry) => entry.endsWith('.js')), false);

  writeFixture(stagePath, 'stale-build-artifact.txt', 'must be removed on rebuild');
  build(root);

  const secondArchiveEntries = execFileSync('unzip', ['-Z1', zipPath], { encoding: 'utf8' })
    .trim()
    .split('\n')
    .sort();
  assert.deepEqual(secondArchiveEntries, firstArchiveEntries);
  assert.equal(fs.existsSync(path.join(stagePath, 'stale-build-artifact.txt')), false);
});
