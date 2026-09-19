#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT_LEXICAL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = fs.realpathSync.native(ROOT_LEXICAL);
const PORTABLE_PACKAGE = path.join(ROOT, 'plugins', 'fulcrum-ai-toolkit');
const GEMINI_MANIFEST = path.join(ROOT, 'adapters', 'gemini', 'gemini-extension.json');
const DEFAULT_DESTINATION = path.join(ROOT, 'plugins', 'fulcrum-ai-toolkit-gemini');
const ASSEMBLER_MARKER = '.fulcrum-ai-toolkit-gemini-generated';
const ASSEMBLER_MARKER_CONTENT = 'fulcrum-ai-toolkit-gemini\n';

function isSameOrDescendant(candidate, parent) {
  return candidate === parent || candidate.startsWith(`${parent}${path.sep}`);
}

function isSameOrAncestor(candidate, child) {
  return child === candidate || child.startsWith(`${candidate}${path.sep}`);
}

function rejectFinalSymlink(target) {
  const stats = fs.lstatSync(target, { throwIfNoEntry: false });

  if (stats?.isSymbolicLink()) {
    throw new Error('Gemini extension destination must not be an existing symbolic link');
  }
}

function canonicalizeDestination(target) {
  let existingParent = target;
  while (!fs.existsSync(existingParent)) {
    const parent = path.dirname(existingParent);
    if (parent === existingParent) {
      return target;
    }
    existingParent = parent;
  }

  const canonicalParent = fs.realpathSync.native(existingParent);
  return path.resolve(canonicalParent, path.relative(existingParent, target));
}

function hasRegularFile(target) {
  const stats = fs.lstatSync(target, { throwIfNoEntry: false });
  return stats?.isFile() === true;
}

function hasAssemblerMarker(target) {
  const marker = path.join(target, ASSEMBLER_MARKER);
  return (
    hasRegularFile(marker) &&
    fs.readFileSync(marker, 'utf8') === ASSEMBLER_MARKER_CONTENT
  );
}

export function assertNoSourceSymlinks(sourceRoot) {
  for (const entry of fs.readdirSync(sourceRoot, { withFileTypes: true })) {
    const sourcePath = path.join(sourceRoot, entry.name);
    const stats = fs.lstatSync(sourcePath);

    if (stats.isSymbolicLink()) {
      throw new Error(`Gemini source tree must not contain symbolic links: ${sourcePath}`);
    }

    if (stats.isDirectory()) {
      assertNoSourceSymlinks(sourcePath);
    }
  }
}

export function copySkillTree(source, destination) {
  assertNoSourceSymlinks(source);
  fs.cpSync(source, destination, {
    recursive: true,
    dereference: true
  });
}

function assertSafeToReplace(target) {
  const stats = fs.lstatSync(target, { throwIfNoEntry: false });

  if (!stats) {
    return;
  }

  if (!stats.isDirectory()) {
    throw new Error('Gemini extension destination must be an existing directory or a new path');
  }

  if (fs.readdirSync(target).length === 0) {
    return;
  }

  if (!hasAssemblerMarker(target)) {
    throw new Error(
      'Gemini extension destination must be empty or contain the assembler marker'
    );
  }
}

export function validateGeminiDestination(destination) {
  const lexicalTarget = path.resolve(destination);
  if (
    isSameOrDescendant(lexicalTarget, ROOT_LEXICAL) &&
    lexicalTarget !== DEFAULT_DESTINATION
  ) {
    throw new Error(
      'Gemini extension destinations inside the repository are limited to the generated bundle path'
    );
  }

  rejectFinalSymlink(lexicalTarget);
  const target = canonicalizeDestination(lexicalTarget);
  const filesystemRoot = path.parse(target).root;

  if (target === filesystemRoot) {
    throw new Error('Gemini extension destination must not be a filesystem root');
  }

  if (isSameOrAncestor(target, ROOT)) {
    throw new Error('Gemini extension destination must not be the repository or one of its ancestors');
  }

  if (lexicalTarget === DEFAULT_DESTINATION && target !== DEFAULT_DESTINATION) {
    throw new Error('Gemini extension default destination must not resolve through a symbolic link');
  }

  if (isSameOrDescendant(target, ROOT) && target !== DEFAULT_DESTINATION) {
    throw new Error(
      'Gemini extension destinations inside the repository are limited to the generated bundle path'
    );
  }

  return target;
}

export function assembleGeminiExtension(destination = DEFAULT_DESTINATION) {
  const target = validateGeminiDestination(destination);
  const manifestContents = fs.readFileSync(GEMINI_MANIFEST, 'utf8');
  const manifest = JSON.parse(manifestContents);
  if (manifest.name !== path.basename(target)) {
    throw new Error(`Gemini manifest name must match destination directory: ${manifest.name}`);
  }
  assertSafeToReplace(target);
  assertSafeToReplace(target);
  const skillSource = path.join(PORTABLE_PACKAGE, 'skills');
  assertNoSourceSymlinks(skillSource);
  fs.rmSync(target, { recursive: true, force: true });
  fs.mkdirSync(target, { recursive: true });
  fs.writeFileSync(path.join(target, ASSEMBLER_MARKER), ASSEMBLER_MARKER_CONTENT);
  fs.copyFileSync(GEMINI_MANIFEST, path.join(target, 'gemini-extension.json'));
  fs.copyFileSync(path.join(PORTABLE_PACKAGE, 'LICENSE'), path.join(target, 'LICENSE'));
  copySkillTree(skillSource, path.join(target, 'skills'));
  return target;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const destination = process.argv[2] || DEFAULT_DESTINATION;
  console.log(`Assembled Gemini extension at ${assembleGeminiExtension(destination)}`);
}
