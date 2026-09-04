#!/usr/bin/env node
// Parser-backed validation for every externalized example and asset in the
// distributable toolkit plugin.
//
// The Ruby suite owns repository policy: inventories, template identity, source
// attribution, and privacy. This tool owns everything that needs a parser —
// proving each file is well formed in its own format, that its SQL is
// read-only, and that its interpolation uses a recognized encoder — with
// established parsers pinned to exact versions in package.json and
// package-lock.json rather than with hand-rolled matching. There is one parser
// per language in this repository, and it lives here.
//
// Nothing this repository authors is executed. HTML is parsed, inline scripts
// and styles are parsed, and a report template is compiled to source by the
// pinned official EJS parser and then parsed. No template is rendered, no
// example script is run, and no query is issued, so validation needs no sandbox
// and claims none.
//
// This tool makes no claim about what a template renders to. It does not model
// EJS escaping, branch coverage, or emitted HTML validity. The two EJS rules
// below are repository example checks: literal facts about the small fixed set
// of templates this repository ships, read off the template text as written.
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
import { HtmlValidate } from 'html-validate';
import postcss from 'postcss';

import { compiledSource, queryCalls } from './lib/ejs-queries.mjs';
import { loadSchemas, SCHEMA_MAPPINGS, validateDocument, validateInventory } from './lib/schema-contract.mjs';
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

const INLINE_SCRIPT = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
const INLINE_STYLE = /<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi;
const SCRIPT_SRC = /(?:^|\s)src\s*=/i;

// Repository example checks for the report templates this repository ships.
// Both are literal: the raw output tag is spelled one way, and each output
// internal is one name. Neither is an analysis of what an arbitrary template
// would escape or emit — the point is that these examples never reach for
// either, so a reader can confirm the rule by looking.
const RAW_OUTPUT_TAG = '<%-';
const OUTPUT_INTERNALS = ['__append', '__output', 'escapeFn'];

const documentValidator = new HtmlValidate({
  extends: ['html-validate:recommended', 'html-validate:document'],
  rules: {
    'script-type': 'off'
  }
});
const fragmentValidator = new HtmlValidate({
  extends: ['html-validate:recommended'],
  rules: {
    'script-type': 'off'
  }
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

// Parsing is where a script stops. Nothing built from an example's source is
// ever called.
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

function parseSql(file, sql, what, options) {
  const violations = readOnlyViolations(sql, options);
  if (violations.length === 0) return true;
  for (const { reason } of violations) fail(file, `${what} ${reason}`);
  return false;
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

function validateEjs(file, text) {
  const label = labelOf(text);
  if (!label) {
    fail(file, 'needs exactly one "Fragment:" or "Document:" label comment');
    return;
  }

  // `generateSource()` is the step `compile()` takes before it builds a
  // function. Stopping here means the template becomes text and then a syntax
  // tree, and never a thing that runs.
  let calls;
  try {
    calls = queryCalls(compiledSource(text, file));
  } catch (error) {
    fail(file, `does not compile to parseable JavaScript: ${String(error.message).split('\n')[0]}`);
    return;
  }

  for (const call of calls) {
    if (call.reason) {
      fail(file, `QUERY() finding #${call.ordinal}: ${call.reason}`);
    } else {
      parseSql(file, call.sql, `QUERY() statement #${call.ordinal}`, { single: true });
    }
    count('embedded-sql');
  }

  let clean = true;
  if (text.includes(RAW_OUTPUT_TAG)) {
    fail(file, `uses the raw output tag ${RAW_OUTPUT_TAG}, which these examples do not use`);
    clean = false;
  }
  for (const name of OUTPUT_INTERNALS) {
    if (new RegExp(`\\b${name}\\b`).test(text)) {
      fail(file, `names the EJS output internal ${name}, which these examples do not use`);
      clean = false;
    }
  }
  if (clean) count('ejs-checked');

  count(`ejs:${label}`);
}

function validateCss(file, text) {
  if (!labelOf(text)) {
    fail(file, 'needs exactly one "Fragment:" or "Document:" label comment');
    return;
  }
  if (parseCss(file, text, 'stylesheet')) count('css');
}

function validateJson(file, text, schemas) {
  let document;
  try {
    document = JSON.parse(text);
    count('json');
  } catch (error) {
    fail(file, `is not valid JSON: ${error.message}`);
    return;
  }

  const relative = path.relative(ROOT, file);
  const schemaName = SCHEMA_MAPPINGS[relative];
  if (schemaName) {
    const errors = validateDocument(document, schemaName, schemas);
    for (const err of errors) {
      fail(file, `schema validation against ${schemaName}: ${err}`);
    }
    count('json:schema');
  }
}

async function main() {
  if (!fs.existsSync(SKILLS)) {
    console.error(`Format validation failed: no skills directory at ${SKILLS}`);
    process.exit(1);
  }

  let schemas;
  try {
    schemas = await loadSchemas();
  } catch (error) {
    console.error(`Format validation failed: ${error.message}`);
    process.exit(1);
  }

  // The contracts prove themselves before they are used on the repository, so a
  // contract that stopped catching bypasses fails here rather than passing
  // everything silently. Their scope is the SQL a QUERY() call may carry.
  const contracts = selfCheck();
  for (const failure of contracts.failures) failures.push(`tools/format-validator: ${failure}`);
  count('contract-probe', contracts.total);

  const files = externalFiles();
  if (files.length === 0) {
    console.error('Format validation failed: no externalized files were found');
    process.exit(1);
  }

  const jsonFiles = files
    .filter((file) => path.extname(file).toLowerCase() === '.json')
    .map((file) => path.relative(ROOT, file));
  const inventoryErrors = validateInventory(jsonFiles);
  for (const err of inventoryErrors) {
    failures.push(`JSON inventory: ${err}`);
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
        validateEjs(file, text);
        break;
      case '.css':
        validateCss(file, text);
        break;
      case '.sql':
        if (parseSql(file, text, 'file')) count('sql');
        break;
      case '.json':
        validateJson(file, text, schemas);
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
