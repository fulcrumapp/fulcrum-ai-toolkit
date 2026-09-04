#!/usr/bin/env node

// Repository validation for skills, manifests, inventories, privacy, and contracts.
// Fully ported to Node.js so that repository validation requires no Ruby runtime.

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const YAML = require('../tools/format-validator/node_modules/yaml');

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const PLUGIN_RELATIVE_PATH = path.join('plugins', 'fulcrum-ai-toolkit');
const PLUGIN_DIR = path.join(ROOT, PLUGIN_RELATIVE_PATH);
const SKILLS_DIR = path.join(PLUGIN_DIR, 'skills');

const EXPECTED_SKILLS = [
  'fulcrum-access-management',
  'fulcrum-app-builder',
  'fulcrum-app-design',
  'fulcrum-app-extensions',
  'fulcrum-app-goal',
  'fulcrum-data-events',
  'fulcrum-data-migration',
  'fulcrum-discovery',
  'fulcrum-gis-mapping',
  'fulcrum-integration-patterns',
  'fulcrum-product-knowledge',
  'fulcrum-query-api',
  'fulcrum-report-building',
  'fulcrum-safety',
  'fulcrum-solution-document',
  'fulcrum-workflow-decomposition'
];

const COVERAGE_MAP_RELATIVE_PATH = path.join(
  PLUGIN_RELATIVE_PATH,
  'docs',
  'legacy-product-knowledge-coverage.md'
);
const EXAMPLE_COVERAGE_RELATIVE_PATH = path.join(
  PLUGIN_RELATIVE_PATH,
  'docs',
  'legacy-example-coverage.md'
);
const FINGERPRINT_ALLOWED_PATHS = [
  COVERAGE_MAP_RELATIVE_PATH,
  EXAMPLE_COVERAGE_RELATIVE_PATH
];

const REQUIRED_COVERAGE_DOMAINS = [
  'Platform overview',
  'Plans and licensing',
  'Field types',
  'App architecture',
  'Data Events',
  'Workflows',
  'Reporting',
  'App Extensions',
  'MCP tools and build flow',
  'Integrations',
  'GIS and mapping',
  'Query API',
  'Users, roles, SSO, and SCIM',
  'Data migration',
  'AI',
  'Sidecars and internal tools',
  'Common misconceptions',
  'Source index'
];

const failures = [];
const jsonDocuments = {};

function repoRelativePath(filePath) {
  return path.relative(ROOT, filePath);
}

function filesUnder(directory) {
  if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) return [];
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true, recursive: true })) {
    if (entry.isFile()) {
      files.push(path.join(entry.parentPath || entry.path, entry.name));
    }
  }
  return files.sort();
}

function referencesSectionHasUrl(text) {
  const marker = '\n## References';
  let idx = text.indexOf(marker);
  if (idx === -1 && text.startsWith('## References')) idx = 0;
  if (idx === -1) return false;
  const content = text.slice(idx + marker.length);
  const nextHeading = content.search(/\n## [^\n]+/);
  const section = nextHeading === -1 ? content : content.slice(0, nextHeading);
  return /\]\(https?:\/\/[^)]+\)/.test(section);
}

// Content contracts
const SOURCE_LABEL = /^(?:Source:|\*\*Source(?::\*\*|\*\*:)|__Source(?::__|__:))/i;
const PROVENANCE_LABEL = /^(?:Provenance:|\*\*Provenance(?::\*\*|\*\*:)|__Provenance(?::__|__:))/i;
const INVENTORY_LABEL = /^(?:Inventory fingerprint:|\*\*Inventory fingerprint(?::\*\*|\*\*:)|__Inventory fingerprint(?::__|__:))/i;
const RESEARCH_EVENT = '(?:[Dd]eep[ -][Dd]ive|[Ww]orkshop|[Ii]nterview|[Ff]ield[ -][Vv]isit|(?:[Cc]ustomer|[Cc]lient|[Ii]nternal)[ -][Ss]ession|(?:[Cc]ustomer|[Cc]lient)[ -][Cc]all)';
const PROPER_TOKEN = '[A-Z][\\p{L}0-9&.\x27-]+';
const ENTITY = `(?:(?:${PROPER_TOKEN}(?:\\s+${PROPER_TOKEN}){1,3})|[A-Z][a-z0-9]+[A-Z][A-Za-z0-9&.\x27-]*|[A-Z]{2,})`;
const ATTRIBUTION_SEPARATOR = '[\\s,;:()—-]{1,8}';
const ATTRIBUTION = new RegExp(`(?:${ENTITY}${ATTRIBUTION_SEPARATOR}${RESEARCH_EVENT}|${RESEARCH_EVENT}${ATTRIBUTION_SEPARATOR}${ENTITY}|${RESEARCH_EVENT}\\s+[Nn]otes?\\s+(?:from|by)\\s+${ENTITY})`, 'u');
const AFFILIATION = new RegExp(`${ENTITY}\\s+(?:at|from)\\s+(?:${ENTITY}|${PROPER_TOKEN})`, 'u');
const PRIVATE_PATH = /^\/(?:Users|home|mnt)(?:\/|\z)/i;
const PRIVATE_WINDOWS_PATH = /^(?:[A-Za-z]:[/\\]Users[/\\]|[A-Za-z]:[/\\]home[/\\])/i;
const PRIVATE_COLLABORATION_URL = /(?:atlassian\.net|slack\.com|github\.com\/fulcrumapp\/app-mcp)/i;
const PRIVATE_HOST_SUFFIXES = [
  'corp', 'example', 'home', 'home.arpa', 'internal',
  'invalid', 'lan', 'local', 'localhost', 'onion', 'test'
];

function normalizeContainerPrefix(sourceLine) {
  let line = sourceLine.trimStart();
  while (true) {
    const blockquote = line.match(/^> ?/);
    if (blockquote) {
      line = line.slice(blockquote[0].length).trimStart();
      continue;
    }
    const list = line.match(/^(?:[-+*]|\d{1,9}[.)])\s+/);
    if (list) {
      line = line.slice(list[0].length).trimStart();
      continue;
    }
    const heading = line.match(/^#{1,6}[ \t]+/);
    if (heading) {
      line = line.slice(heading[0].length).trimStart();
      continue;
    }
    break;
  }
  return line;
}

function publicDnsName(host) {
  if (typeof host !== 'string' || host.length > 253) return false;
  const labels = host.split('.');
  if (labels.length < 2) return false;
  if (PRIVATE_HOST_SUFFIXES.some((s) => host === s || host.endsWith(`.${s}`))) return false;
  return labels.every(
    (l) => l.length >= 1 && l.length <= 63 && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(l)
  );
}

function publicUrl(text) {
  const urls = text.match(/https?:\/\/[^\s"'`<>)]+/gi) || [];
  return urls.some((url) => {
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.toLowerCase().replace(/\.\z/, '');
      if (!publicDnsName(host)) return false;
      const isNumeric = host.split('.').every((label) => /^(\d+|0x[0-9a-f]+)$/i.test(label));
      return !isNumeric && !host.includes(':');
    } catch {
      return false;
    }
  });
}

function privateProvenance(text) {
  const lines = text.split('\n');
  const nonSourceText = lines
    .filter((line) => {
      const normalized = normalizeContainerPrefix(line);
      return !SOURCE_LABEL.test(normalized) && !INVENTORY_LABEL.test(normalized);
    })
    .join('\n');
  return ATTRIBUTION.test(nonSourceText);
}

function invalidSourceAttributions(text) {
  const invalid = [];
  for (const line of text.split('\n')) {
    const normalized = normalizeContainerPrefix(line);
    if (PROVENANCE_LABEL.test(normalized)) {
      invalid.push(line.trim());
      continue;
    }
    if (!SOURCE_LABEL.test(normalized)) continue;
    if (!publicUrl(normalized)) {
      invalid.push(line.trim());
      continue;
    }
    const unlinked = normalized
      .replace(SOURCE_LABEL, '')
      .replace(/\[[^\]]*\]\((?:<https?:\/\/[^>]+>|https?:\/\/[^)]+)\)/gi, '')
      .replace(/https?:\/\/[^\s"'`<>]+/gi, '');
    if (AFFILIATION.test(unlinked) || ATTRIBUTION.test(unlinked)) {
      invalid.push(line.trim());
    }
  }
  return invalid;
}

function invalidInventoryFingerprints(text, relativePath, allowedPaths) {
  const lines = [];
  for (const line of text.split('\n')) {
    const normalized = normalizeContainerPrefix(line);
    if (INVENTORY_LABEL.test(normalized)) {
      lines.push(line.trim());
    }
  }
  return allowedPaths.includes(relativePath) ? [] : lines;
}

function privateFilesystemPath(text) {
  const fileUris = text.match(/file:\/\/[^\s"'`<>)]+/gi) || [];
  if (fileUris.some((uri) => {
    try {
      const p = new URL(uri).pathname;
      return PRIVATE_PATH.test(p);
    } catch {
      return false;
    }
  })) {
    return true;
  }

  const withoutWebUrls = text.replace(/https?:\/\/[^\s"'`<>)]+/gi, '');
  const pathMatches = [...withoutWebUrls.matchAll(/(?:^|[\s"'`(\[{:=>])(\/[^\s"'`<>]*)/g)].map((m) => m[1]);
  return pathMatches.some((p) => PRIVATE_PATH.test(p)) || PRIVATE_WINDOWS_PATH.test(withoutWebUrls);
}

// 1. Skill inventory check
const skillPaths = fs.existsSync(SKILLS_DIR)
  ? fs
      .readdirSync(SKILLS_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => path.join(SKILLS_DIR, d.name, 'SKILL.md'))
      .filter((f) => fs.existsSync(f))
      .sort()
  : [];

const actualSkillNames = skillPaths.map((p) => path.basename(path.dirname(p))).sort();
if (JSON.stringify(actualSkillNames) !== JSON.stringify(EXPECTED_SKILLS.slice().sort())) {
  const missing = EXPECTED_SKILLS.filter((s) => !actualSkillNames.includes(s));
  const unexpected = actualSkillNames.filter((s) => !EXPECTED_SKILLS.includes(s));
  failures.push(`skill inventory mismatch (missing: ${missing.join(', ')}; unexpected: ${unexpected.join(', ')})`);
}

// 2. Validate each skill
for (const skillPath of skillPaths) {
  const relativePath = repoRelativePath(skillPath);
  const directoryName = path.basename(path.dirname(skillPath));
  const text = fs.readFileSync(skillPath, 'utf8');
  const parts = text.split(/^---\s*$/m);

  if (parts.length < 3) {
    failures.push(`${relativePath}: missing YAML frontmatter`);
    continue;
  }

  let frontmatter;
  try {
    frontmatter = YAML.parse(parts[1]);
  } catch (err) {
    failures.push(`${relativePath}: invalid YAML frontmatter (${err.message.split('\n')[0].trim()})`);
    continue;
  }

  if (!frontmatter || typeof frontmatter !== 'object' || !frontmatter.name || !frontmatter.description) {
    failures.push(`${relativePath}: frontmatter needs name and description`);
  }

  if (frontmatter && frontmatter.name !== directoryName) {
    failures.push(`${relativePath}: frontmatter name does not match directory`);
  }

  if (text.includes('/mnt/skills/organization')) {
    failures.push(`${relativePath}: contains a corporate absolute skill path`);
  }

  if (text.includes('github.com/fulcrumapp/app-mcp')) {
    failures.push(`${relativePath}: contains a private App MCP repository URL`);
  }

  if (/(?:api[_-]?token|secret|password| bearer )[=:][\s]*[A-Za-z0-9_-]{12,}/i.test(text)) {
    failures.push(`${relativePath}: possible credential in skill content`);
  }

  if (!referencesSectionHasUrl(text)) {
    failures.push(`${relativePath}: add a References section with at least one URL`);
  }
}

// 3. JSON files syntax check
const jsonSearchDirs = [
  ROOT,
  path.join(ROOT, '.claude-plugin'),
  path.join(ROOT, '.cursor-plugin'),
  path.join(ROOT, '.github', 'plugin'),
  path.join(ROOT, '.agents', 'plugins'),
  PLUGIN_DIR,
  path.join(PLUGIN_DIR, '.claude-plugin'),
  path.join(PLUGIN_DIR, '.cursor-plugin'),
  path.join(PLUGIN_DIR, '.codex-plugin')
];

const foundJsonPaths = new Set();
for (const dir of jsonSearchDirs) {
  if (!fs.existsSync(dir)) continue;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith('.json')) {
      foundJsonPaths.add(path.join(dir, entry.name));
    }
  }
}

for (const jsonPath of [...foundJsonPaths].sort()) {
  const relative = repoRelativePath(jsonPath);
  try {
    jsonDocuments[relative] = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  } catch (err) {
    failures.push(`${relative}: invalid JSON (${err.message})`);
  }
}

// 4. Public text path checks
const publicTextPaths = [
  path.join(ROOT, 'README.md'),
  path.join(ROOT, 'marketplace.json'),
  path.join(ROOT, '.claude-plugin', 'marketplace.json'),
  path.join(ROOT, '.github', 'plugin', 'marketplace.json'),
  path.join(ROOT, '.agents', 'plugins', 'marketplace.json'),
  ...filesUnder(PLUGIN_DIR)
];

const uniqueTextPaths = [...new Set(publicTextPaths)].filter((p) => fs.existsSync(p) && fs.statSync(p).isFile());
for (const p of uniqueTextPaths) {
  const relative = repoRelativePath(p);
  const text = fs.readFileSync(p, 'utf8');

  if (PRIVATE_COLLABORATION_URL.test(text) || privateFilesystemPath(text)) {
    failures.push(`${relative}: contains a private path or collaboration URL`);
  }

  if (privateProvenance(text)) {
    failures.push(`${relative}: contains private person or customer provenance`);
  }

  for (const _ of invalidSourceAttributions(text)) {
    failures.push(`${relative}: Source attribution must include a public URL on the same line`);
  }

  for (const _ of invalidInventoryFingerprints(text, relative, FINGERPRINT_ALLOWED_PATHS)) {
    failures.push(`${relative}: Inventory fingerprint is allowed only in ${FINGERPRINT_ALLOWED_PATHS.join(' or ')}`);
  }
}

// 5. Manifest checks
const AGENT_PLUGIN_SCHEMA = 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json';
const AGENT_MCP_SCHEMA = 'https://agent-plugins.org/schemas/1.0.0/mcp.schema.json';
const agentManifest = jsonDocuments[`${PLUGIN_RELATIVE_PATH}/plugin.json`];
if (agentManifest) {
  if (agentManifest.$schema !== AGENT_PLUGIN_SCHEMA) {
    failures.push(`${PLUGIN_RELATIVE_PATH}/plugin.json: $schema must identify Agent Plugins 1.0.0`);
  }
  if (!agentManifest.name) {
    failures.push(`${PLUGIN_RELATIVE_PATH}/plugin.json: name is required`);
  }
}

const agentMcp = jsonDocuments[`${PLUGIN_RELATIVE_PATH}/mcp.json`];
if (agentMcp) {
  if (agentMcp.$schema !== AGENT_MCP_SCHEMA) {
    failures.push(`${PLUGIN_RELATIVE_PATH}/mcp.json: $schema must identify Agent Plugins MCP 1.0.0`);
  }
}

const cursorManifestPath = `${PLUGIN_RELATIVE_PATH}/.cursor-plugin/plugin.json`;
const cursorManifest = jsonDocuments[cursorManifestPath];
if (cursorManifest) {
  if (cursorManifest.skills !== './skills/') {
    failures.push(`${cursorManifestPath}: skills must point to ./skills/`);
  }
}

const hermesManifest = path.join(PLUGIN_DIR, '.hermes-plugin', 'plugin.yaml');
if (fs.existsSync(hermesManifest)) {
  try {
    const config = YAML.parse(fs.readFileSync(hermesManifest, 'utf8'));
    if (!config || config.skills_dir !== 'skills') {
      failures.push(`${PLUGIN_RELATIVE_PATH}/.hermes-plugin/plugin.yaml: skills_dir must point to skills`);
    }
  } catch (err) {
    failures.push(`${PLUGIN_RELATIVE_PATH}/.hermes-plugin/plugin.yaml: invalid YAML (${err.message.split('\n')[0].trim()})`);
  }
} else {
  failures.push(`${PLUGIN_RELATIVE_PATH}/.hermes-plugin/plugin.yaml: manifest is missing`);
}

const marketplaceSources = {
  '.github/plugin/marketplace.json': './plugins/fulcrum-ai-toolkit',
  '.claude-plugin/marketplace.json': './plugins/fulcrum-ai-toolkit',
  'marketplace.json': './plugins/fulcrum-ai-toolkit'
};
for (const [relPath, expectedSource] of Object.entries(marketplaceSources)) {
  const actualSource = jsonDocuments[relPath]?.plugins?.[0]?.source;
  if (actualSource !== expectedSource) {
    failures.push(`${relPath}: plugin source must point to ${expectedSource}`);
  }
}

const codexMarketplaceSource = jsonDocuments['.agents/plugins/marketplace.json']?.plugins?.[0]?.source;
if (
  !codexMarketplaceSource ||
  codexMarketplaceSource.source !== 'local' ||
  codexMarketplaceSource.path !== './plugins/fulcrum-ai-toolkit'
) {
  failures.push('.agents/plugins/marketplace.json: plugin source must point to the local package');
}

if (!fs.existsSync(PLUGIN_DIR) || !fs.existsSync(SKILLS_DIR)) {
  failures.push(`${PLUGIN_RELATIVE_PATH}: distributable plugin package is missing`);
}

const openapiExampleSkill = path.join(ROOT, '.agents', 'skills', 'validate-openapi-examples', 'SKILL.md');
if (!fs.existsSync(openapiExampleSkill)) {
  failures.push('.agents/skills/validate-openapi-examples/SKILL.md: repository validation skill is missing');
}

const readme = path.join(ROOT, 'README.md');
const readmeText = fs.readFileSync(readme, 'utf8');
const readmeSkillNames = [...readmeText.matchAll(/^\| `([^`]+)` \|/gm)].map((m) => m[1]).sort();
if (JSON.stringify(readmeSkillNames) !== JSON.stringify(actualSkillNames)) {
  failures.push(`README skill inventory does not match ${PLUGIN_RELATIVE_PATH}/skills/*/SKILL.md`);
}

if (!referencesSectionHasUrl(readmeText)) {
  failures.push('README.md: add a References section with at least one URL');
}

// Coverage maps
const coverageMap = path.join(ROOT, COVERAGE_MAP_RELATIVE_PATH);
if (fs.existsSync(coverageMap)) {
  const coverageText = fs.readFileSync(coverageMap, 'utf8');
  for (const domain of REQUIRED_COVERAGE_DOMAINS) {
    const escaped = domain.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (!new RegExp(`^\\|\\s+\\*\\*${escaped}\\*\\*`, 'm').test(coverageText)) {
      failures.push(`${COVERAGE_MAP_RELATIVE_PATH}: missing coverage row for ${domain}`);
    }
  }
  if (!coverageText.includes('## Source hierarchy')) {
    failures.push(`${COVERAGE_MAP_RELATIVE_PATH}: missing source hierarchy`);
  }
  if (!coverageText.includes('## Review and retirement')) {
    failures.push(`${COVERAGE_MAP_RELATIVE_PATH}: missing review and retirement criteria`);
  }
  if (!/SHA-256:\s*(?:>\s*)?`[0-9a-f]{64}`/i.test(coverageText)) {
    failures.push(`${COVERAGE_MAP_RELATIVE_PATH}: missing legacy artifact SHA-256`);
  }
} else {
  failures.push(`${COVERAGE_MAP_RELATIVE_PATH}: coverage manifest is missing`);
}

const exampleCoverage = path.join(ROOT, EXAMPLE_COVERAGE_RELATIVE_PATH);
if (fs.existsSync(exampleCoverage)) {
  const exampleText = fs.readFileSync(exampleCoverage, 'utf8');
  if (!/SHA-256:\s*\n?>?\s*`[0-9a-f]{64}`/.test(exampleText)) {
    failures.push(`${EXAMPLE_COVERAGE_RELATIVE_PATH}: missing legacy artifact SHA-256`);
  }
  if (!exampleText.includes('## Source rules for executable files')) {
    failures.push(`${EXAMPLE_COVERAGE_RELATIVE_PATH}: missing executable source rules`);
  }
  if (/(?:\/(?:Users|home)\/|atlassian\.net|slack\.com)/i.test(exampleText)) {
    failures.push(`${EXAMPLE_COVERAGE_RELATIVE_PATH}: contains a local path or private collaboration URL`);
  }
} else {
  failures.push(`${EXAMPLE_COVERAGE_RELATIVE_PATH}: example coverage manifest is missing`);
}

if (failures.length === 0) {
  console.log(`Validation passed: ${skillPaths.length} skills and ${Object.keys(jsonDocuments).length} JSON manifests`);
  process.exit(0);
}

console.error('Validation failed:');
for (const failure of failures) {
  console.error(`- ${failure}`);
}
process.exit(1);
