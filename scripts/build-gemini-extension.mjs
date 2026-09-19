#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORTABLE_PACKAGE = path.join(ROOT, 'plugins', 'fulcrum-ai-toolkit');
const GEMINI_MANIFEST = path.join(ROOT, 'adapters', 'gemini', 'gemini-extension.json');
const DEFAULT_DESTINATION = path.join(ROOT, 'plugins', 'fulcrum-ai-toolkit-gemini');

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

export function validateGeminiDestination(destination) {
  const lexicalTarget = path.resolve(destination);
  rejectFinalSymlink(lexicalTarget);
  const target = canonicalizeDestination(lexicalTarget);
  const filesystemRoot = path.parse(target).root;

  if (target === filesystemRoot) {
    throw new Error('Gemini extension destination must not be a filesystem root');
  }

  if (isSameOrAncestor(target, ROOT)) {
    throw new Error('Gemini extension destination must not be the repository or one of its ancestors');
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
  const manifest = JSON.parse(fs.readFileSync(GEMINI_MANIFEST, 'utf8'));
  if (manifest.name !== path.basename(target)) {
    throw new Error(`Gemini manifest name must match destination directory: ${manifest.name}`);
  }

  fs.rmSync(target, { recursive: true, force: true });
  fs.mkdirSync(target, { recursive: true });
  fs.copyFileSync(GEMINI_MANIFEST, path.join(target, 'gemini-extension.json'));
  fs.copyFileSync(path.join(PORTABLE_PACKAGE, 'LICENSE'), path.join(target, 'LICENSE'));
  fs.cpSync(path.join(PORTABLE_PACKAGE, 'skills'), path.join(target, 'skills'), {
    recursive: true,
    dereference: true
  });
  return target;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const destination = process.argv[2] || DEFAULT_DESTINATION;
  console.log(`Assembled Gemini extension at ${assembleGeminiExtension(destination)}`);
}
