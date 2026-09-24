#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

const CONVERTIBLE_EXTENSIONS = new Map([
  ['.js', 'javascript'],
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

function convertedRelativePath(sourceRelativePath, ext = path.extname(sourceRelativePath).toLowerCase()) {
  if (path.basename(sourceRelativePath) === 'LICENSE' && ext === '') {
    return `${sourceRelativePath}.md`;
  }
  if (!CONVERTIBLE_EXTENSIONS.has(ext)) {
    return sourceRelativePath;
  }
  const suffix = ext.slice(1);
  return `${sourceRelativePath.slice(0, -ext.length)}-${suffix}.md`;
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

function stageFile(sourcePath, packageDir, stageDir) {
  const sourceRelativePath = path.relative(packageDir, sourcePath);
  const basename = path.basename(sourcePath);
  const ext = path.extname(sourcePath).toLowerCase();

  if (basename === 'LICENSE' && ext === '') {
    const targetRelativePath = convertedRelativePath(sourceRelativePath, ext);
    const targetPath = path.join(stageDir, targetRelativePath);
    ensureDir(path.dirname(targetPath));
    convertToMarkdown(targetPath, 'text', fs.readFileSync(sourcePath, 'utf8'), sourceRelativePath);
    return;
  }

  if (CONVERTIBLE_EXTENSIONS.has(ext)) {
    const targetRelativePath = convertedRelativePath(sourceRelativePath, ext);
    const targetPath = path.join(stageDir, targetRelativePath);
    ensureDir(path.dirname(targetPath));
    convertToMarkdown(
      targetPath,
      CONVERTIBLE_EXTENSIONS.get(ext),
      fs.readFileSync(sourcePath, 'utf8'),
      sourceRelativePath
    );
    return;
  }

  const targetPath = path.join(stageDir, sourceRelativePath);
  ensureDir(path.dirname(targetPath));
  fs.copyFileSync(sourcePath, targetPath);
}

function stageDirectory(sourceDir, packageDir, stageDir) {
  const entries = fs.readdirSync(sourceDir, { withFileTypes: true });
  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name);
    if (entry.isDirectory()) {
      stageDirectory(sourcePath, packageDir, stageDir);
      continue;
    }
    stageFile(sourcePath, packageDir, stageDir);
  }
}

function rewriteMarkdownLinks(stageDir) {
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

  visit(stageDir);

  for (const markdownFile of markdownFiles) {
    const text = fs.readFileSync(markdownFile, 'utf8');
    const updated = text.replace(
      /(?<![A-Za-z0-9_./-])(?:LICENSE|[A-Za-z0-9_./-]+\.(?:js|ejs|css|sql))(?![A-Za-z0-9_./-])/g,
      (candidate) => {
        const nextCandidate = convertedRelativePath(candidate);
        const candidatePath = path.resolve(path.dirname(markdownFile), nextCandidate);
        if (!candidatePath.startsWith(stageDir)) {
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

export function build(root = ROOT) {
  const packageDir = path.join(root, 'plugins', 'fulcrum-ai-toolkit');
  const stageDir = path.join(root, '.m365-bundle-stage');
  const outputZip = path.join(root, 'fulcrum-ai-toolkit-m365.zip');

  fs.rmSync(stageDir, { recursive: true, force: true });
  fs.rmSync(outputZip, { force: true });
  ensureDir(stageDir);

  stageFile(path.join(packageDir, 'SKILL.md'), packageDir, stageDir);
  stageDirectory(path.join(packageDir, 'skills'), packageDir, stageDir);
  stageFile(path.join(packageDir, 'LICENSE'), packageDir, stageDir);
  rewriteMarkdownLinks(stageDir);

  execFileSync('zip', ['-rq', outputZip, '.'], {
    cwd: stageDir,
    stdio: 'inherit'
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  build();
}
