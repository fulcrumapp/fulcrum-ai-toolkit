#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const PACKAGE_DIR = path.join(ROOT, 'plugins', 'fulcrum-ai-toolkit');
const STAGE_DIR = path.join(ROOT, '.m365-bundle-stage');
const OUTPUT_ZIP = path.join(ROOT, 'fulcrum-ai-toolkit-m365.zip');

const CONVERTIBLE_EXTENSIONS = new Map([
  ['.ejs', 'html'],
  ['.css', 'css'],
  ['.sql', 'sql']
]);

function ensureDir(targetDir) {
  fs.mkdirSync(targetDir, { recursive: true });
}

function toPosix(relativePath) {
  return relativePath.split(path.sep).join('/');
}

function convertToMarkdown(targetPath, language, sourceText, sourceRelativePath) {
  const markdown = [
    `# Converted source: ${toPosix(sourceRelativePath)}`,
    '',
    '```' + language,
    sourceText.replace(/\n$/, ''),
    '```',
    ''
  ].join('\n');
  fs.writeFileSync(targetPath, markdown, 'utf8');
}

function stageFile(sourcePath) {
  const sourceRelativePath = path.relative(PACKAGE_DIR, sourcePath);
  const basename = path.basename(sourcePath);
  const ext = path.extname(sourcePath).toLowerCase();

  if (basename === 'LICENSE' && ext === '') {
    const targetRelativePath = `${sourceRelativePath}.md`;
    const targetPath = path.join(STAGE_DIR, targetRelativePath);
    ensureDir(path.dirname(targetPath));
    convertToMarkdown(targetPath, 'text', fs.readFileSync(sourcePath, 'utf8'), sourceRelativePath);
    return;
  }

  if (CONVERTIBLE_EXTENSIONS.has(ext)) {
    const targetRelativePath = `${sourceRelativePath}.md`;
    const targetPath = path.join(STAGE_DIR, targetRelativePath);
    ensureDir(path.dirname(targetPath));
    convertToMarkdown(
      targetPath,
      CONVERTIBLE_EXTENSIONS.get(ext),
      fs.readFileSync(sourcePath, 'utf8'),
      sourceRelativePath
    );
    return;
  }

  const targetPath = path.join(STAGE_DIR, sourceRelativePath);
  ensureDir(path.dirname(targetPath));
  fs.copyFileSync(sourcePath, targetPath);
}

function stageDirectory(sourceDir) {
  const entries = fs.readdirSync(sourceDir, { withFileTypes: true });
  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name);
    if (entry.isDirectory()) {
      stageDirectory(sourcePath);
      continue;
    }
    stageFile(sourcePath);
  }
}

function rewriteMarkdownLinks() {
  const markdownFiles = [];
  const visit = (dir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        visit(fullPath);
      } else if (entry.isFile() && path.extname(entry.name).toLowerCase() === '.md') {
        markdownFiles.push(fullPath);
      }
    }
  };

  visit(STAGE_DIR);

  for (const markdownFile of markdownFiles) {
    const text = fs.readFileSync(markdownFile, 'utf8');
    const updated = text.replace(
      /(?<![A-Za-z0-9_./-])(?:LICENSE|[A-Za-z0-9_./-]+\.(?:ejs|css|sql))(?![A-Za-z0-9_./-])/g,
      (candidate) => {
        const nextCandidate = candidate === 'LICENSE' ? 'LICENSE.md' : `${candidate}.md`;
        const candidatePath = path.resolve(path.dirname(markdownFile), nextCandidate);
        if (!candidatePath.startsWith(STAGE_DIR)) {
          return candidate;
        }
        return fs.existsSync(candidatePath) ? nextCandidate : candidate;
      }
    );
    if (updated !== text) {
      fs.writeFileSync(markdownFile, updated, 'utf8');
    }
  }
}

function build() {
  fs.rmSync(STAGE_DIR, { recursive: true, force: true });
  fs.rmSync(OUTPUT_ZIP, { force: true });
  ensureDir(STAGE_DIR);

  stageFile(path.join(PACKAGE_DIR, 'SKILL.md'));
  stageDirectory(path.join(PACKAGE_DIR, 'skills'));
  stageFile(path.join(PACKAGE_DIR, 'LICENSE'));
  rewriteMarkdownLinks();

  execFileSync('zip', ['-rq', OUTPUT_ZIP, '.'], {
    cwd: STAGE_DIR,
    stdio: 'inherit'
  });
}

build();
