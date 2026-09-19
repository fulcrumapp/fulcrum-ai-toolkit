#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORTABLE_PACKAGE = path.join(ROOT, 'plugins', 'fulcrum-ai-toolkit');
const GEMINI_MANIFEST = path.join(ROOT, 'adapters', 'gemini', 'gemini-extension.json');
const DEFAULT_DESTINATION = path.join(ROOT, 'plugins', 'fulcrum-ai-toolkit-gemini');

export function assembleGeminiExtension(destination = DEFAULT_DESTINATION) {
  const target = path.resolve(destination);
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
