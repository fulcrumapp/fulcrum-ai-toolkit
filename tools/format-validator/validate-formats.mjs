#!/usr/bin/env node
// Parser-backed validation for every externalized example and asset in the
// distributable toolkit plugin.
//
// The Ruby suite owns repository policy: inventories, source attribution, and
// privacy. This tool owns everything that needs a parser — proving each file is
// well formed in its own format, that its SQL is read-only and its
// interpolation safe, and that its rendered markup is structurally valid on
// every branch — and it does that with established parsers pinned to exact
// versions in package.json and package-lock.json, rather than with hand-rolled
// matching. There is one parser per language in this repository, and it lives
// here.
//
// Every commentable file that is not a whole document in its own right is
// labeled `Fragment:`; a whole document is labeled `Document:`. The label
// decides how the file is validated, so an HTML fragment is not failed for
// lacking a doctype and a whole page is not excused for missing one.

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import * as acorn from 'acorn';
import ejs from 'ejs';
import { HtmlValidate } from 'html-validate';
import postcss from 'postcss';

import { compiledSource, queryCalls } from './lib/ejs-queries.mjs';
import { renderScenarios } from './lib/render-coverage.mjs';
import { hostDocument, HOST_LINE_OFFSET, scenariosFor } from './lib/render-fixtures.mjs';
import { selfCheck } from './lib/self-check.mjs';
import { readOnlyViolations } from './lib/sql-contract.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const SKILLS = path.join(ROOT, 'plugins', 'fulcrum-ai-toolkit', 'skills');
const EXTERNAL_DIRECTORIES = ['examples', 'assets'];
const INDEX_BASENAME = 'README.md';

// Formats with no structural parser of their own. They are still enumerated so
// that a new extension cannot slip through unvalidated.
const PROSE_EXTENSIONS = new Set(['.md', '.txt']);

const DOCUMENT_LABEL = /(?:^|[^A-Za-z])Document:/;
const FRAGMENT_LABEL = /(?:^|[^A-Za-z])Fragment:/;

const INLINE_SCRIPT = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
const INLINE_STYLE = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
const SCRIPT_SRC = /\bsrc\s*=/i;

const documentValidator = new HtmlValidate({
  extends: ['html-validate:recommended', 'html-validate:document']
});
const fragmentValidator = new HtmlValidate({
  extends: ['html-validate:recommended']
});
// Rendered output is machine-produced: an EJS tag leaves the whitespace that
// stood around it, so a whitespace rule reports the template engine rather than
// the example. Everything structural and accessible still applies.
const renderedValidator = new HtmlValidate({
  extends: ['html-validate:recommended'],
  rules: { 'no-trailing-whitespace': 'off' }
});

const failures = [];
const counts = new Map();

function fail(file, message) {
  failures.push(`${path.relative(ROOT, file)}: ${message}`);
}

function count(kind, amount = 1) {
  counts.set(kind, (counts.get(kind) ?? 0) + amount);
}

function filesUnder(directory) {
  const found = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      found.push(...filesUnder(full));
    } else if (entry.isFile()) {
      found.push(full);
    }
  }
  return found.sort();
}

function externalFiles() {
  const skills = fs
    .readdirSync(SKILLS, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  const found = [];
  for (const skill of skills) {
    for (const directory of EXTERNAL_DIRECTORIES) {
      const root = path.join(SKILLS, skill, directory);
      if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) continue;
      for (const file of filesUnder(root)) {
        if (path.basename(file) === INDEX_BASENAME) continue;
        found.push(file);
      }
    }
  }
  return found;
}

// Returns 'document', 'fragment', or null when the file carries no label or
// carries both.
function labelOf(text) {
  const isDocument = DOCUMENT_LABEL.test(text);
  const isFragment = FRAGMENT_LABEL.test(text);
  if (isDocument === isFragment) return null;
  return isDocument ? 'document' : 'fragment';
}

function parseScript(file, code, what) {
  try {
    acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'script' });
    return true;
  } catch (error) {
    fail(file, `${what} is not valid JavaScript: ${error.message}`);
    return false;
  }
}

function parseCss(file, css, what) {
  try {
    postcss.parse(css, { from: file });
    return true;
  } catch (error) {
    fail(file, `${what} is not valid CSS: ${error.message}`);
    return false;
  }
}

function parseSql(file, sql, what) {
  const violations = readOnlyViolations(sql);
  if (violations.length === 0) return true;
  for (const { reason } of violations) fail(file, `${what} ${reason}`);
  return false;
}

async function reportHtml(file, html, what) {
  const report = await renderedValidator.validateString(hostDocument(html), file);
  if (report.valid) return;
  for (const result of report.results) {
    for (const message of result.messages) {
      const line = message.line - HOST_LINE_OFFSET;
      fail(file, `${what} ${line}:${message.column} ${message.ruleId}: ${message.message}`);
    }
  }
}

async function validateHtml(file, text) {
  const label = labelOf(text);
  if (!label) {
    fail(file, 'needs exactly one "Fragment:" or "Document:" label comment');
    return;
  }

  const validator = label === 'document' ? documentValidator : fragmentValidator;
  const report = await validator.validateString(text, file);
  if (!report.valid) {
    for (const result of report.results) {
      for (const message of result.messages) {
        fail(file, `${label} HTML ${message.line}:${message.column} ${message.ruleId}: ${message.message}`);
      }
    }
  }

  let inlineScripts = 0;
  for (const match of text.matchAll(INLINE_SCRIPT)) {
    if (SCRIPT_SRC.test(match[1])) continue;
    if (match[2].trim() === '') continue;
    inlineScripts += 1;
    parseScript(file, match[2], `inline <script> #${inlineScripts}`);
    count('inline-script');
  }

  let inlineStyles = 0;
  for (const match of text.matchAll(INLINE_STYLE)) {
    if (match[1].trim() === '') continue;
    inlineStyles += 1;
    parseCss(file, match[1], `inline <style> #${inlineStyles}`);
    count('inline-style');
  }

  count(`html:${label}`);
}

async function validateEjs(file, text) {
  const label = labelOf(text);
  if (!label) {
    fail(file, 'needs exactly one "Fragment:" or "Document:" label comment');
    return;
  }

  let source;
  try {
    ejs.compile(text, { filename: file });
    source = compiledSource(text, file);
  } catch (error) {
    fail(file, `EJS does not compile: ${String(error.message).split('\n')[0]}`);
    return;
  }

  // SQL is read out of the compiled syntax tree, never by rendering.
  let calls;
  try {
    calls = queryCalls(source);
  } catch (error) {
    fail(file, `compiled EJS is not parseable JavaScript: ${String(error.message).split('\n')[0]}`);
    return;
  }
  for (const call of calls) {
    if (call.reason) {
      fail(file, `QUERY() finding #${call.ordinal}: ${call.reason}`);
    } else {
      parseSql(file, call.sql, `QUERY() statement #${call.ordinal}`);
    }
    count('embedded-sql');
  }

  // Markup is read out of the rendered output, because a row emitted inside a
  // loop is invisible to a static reader of the template. Each template has its
  // own scenarios, and the branches they miss are reported rather than assumed
  // away.
  const scenarios = scenariosFor(path.basename(file));
  if (!scenarios) {
    fail(file, 'has no render fixtures in lib/render-fixtures.mjs, so its markup was never rendered');
    return;
  }

  let run;
  try {
    run = await renderScenarios(text, file, scenarios);
  } catch (error) {
    fail(file, `could not be rendered under coverage: ${String(error.message).split('\n')[0]}`);
    return;
  }

  for (const rendered of run.renders) {
    if (rendered.error) {
      fail(file, `does not render with the "${rendered.name}" fixture: ${rendered.error}`);
      continue;
    }
    await reportHtml(file, rendered.html, `rendered "${rendered.name}" HTML`);
    count('rendered-html');
  }

  for (const branch of run.uncovered) {
    fail(
      file,
      `line ${branch.line} holds a branch no fixture reaches, so its markup is never validated: ${branch.text}`
    );
  }
  if (run.uncovered.length === 0) count('branch-covered');

  count(`ejs:${label}`);
}

function validateCss(file, text) {
  if (!labelOf(text)) {
    fail(file, 'needs exactly one "Fragment:" or "Document:" label comment');
    return;
  }
  if (parseCss(file, text, 'stylesheet')) count('css');
}

function validateJson(file, text) {
  try {
    JSON.parse(text);
    count('json');
  } catch (error) {
    fail(file, `is not valid JSON: ${error.message}`);
  }
}

async function main() {
  if (!fs.existsSync(SKILLS)) {
    console.error(`Format validation failed: no skills directory at ${SKILLS}`);
    process.exit(1);
  }

  // The contracts prove themselves before they are used on the repository, so a
  // contract that stopped catching bypasses fails here rather than passing
  // everything silently.
  const contracts = await selfCheck(renderedValidator);
  for (const failure of contracts.failures) failures.push(`tools/format-validator: ${failure}`);
  count('contract-fixture', contracts.total);

  const files = externalFiles();
  if (files.length === 0) {
    console.error('Format validation failed: no externalized files were found');
    process.exit(1);
  }

  for (const file of files) {
    const extension = path.extname(file).toLowerCase();
    const text = fs.readFileSync(file, 'utf8');

    switch (extension) {
      case '.js':
        if (parseScript(file, text, 'file')) count('js');
        break;
      case '.html':
        await validateHtml(file, text);
        break;
      case '.ejs':
        await validateEjs(file, text);
        break;
      case '.css':
        validateCss(file, text);
        break;
      case '.sql':
        if (parseSql(file, text, 'file')) count('sql');
        break;
      case '.json':
        validateJson(file, text);
        break;
      default:
        if (PROSE_EXTENSIONS.has(extension)) {
          count('prose');
        } else {
          fail(file, `has no structural validation rule for "${extension}"`);
        }
    }
  }

  if (failures.length > 0) {
    console.error('Format validation failed:');
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  const summary = [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([kind, total]) => `${kind}=${total}`)
    .join(' ');
  console.log(`Format validation passed: ${files.length} externalized files (${summary})`);
}

await main();
