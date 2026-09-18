#!/usr/bin/env node

// Repository validation for skills, manifests, inventories, privacy, and contracts.
// Fully ported to Node.js so that repository validation requires no Ruby runtime.

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let YAML;
let containsGenericElementDiscriminator;
let isElementDiscriminatorContractPath;
try {
  YAML = require('../tools/format-validator/node_modules/yaml');
  ({
    containsGenericElementDiscriminator,
    isElementDiscriminatorContractPath
  } = await import('../tools/format-validator/lib/element-discriminator.mjs'));
} catch {
  console.error('Missing validator dependencies. Run `npm ci` in tools/format-validator first.');
  process.exit(1);
}

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
  'fulcrum-app-scorecard',
  'fulcrum-data-events',
  'fulcrum-data-migration',
  'fulcrum-discovery',
  'fulcrum-gis-mapping',
  'fulcrum-integration-patterns',
  'fulcrum-performance-review',
  'fulcrum-product-knowledge',
  'fulcrum-query-api',
  'fulcrum-report-building',
  'fulcrum-safety',
  'fulcrum-solution-document',
  'fulcrum-workflow-decomposition'
];
const USER_INVOKED_SKILLS = new Set(['fulcrum-solution-document']);
const AGENT_SKILL_FIELDS = new Set([
  'name',
  'description',
  'license',
  'compatibility',
  'metadata',
  'allowed-tools'
]);

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
  const match = text.match(/(?:^|\n)## References(?:\r?\n|$)/);
  if (!match) return false;
  const content = text.slice(match.index + match[0].length);
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
const PRIVATE_PATH = /^\/(?:Users|home|mnt)(?:\/|$)/i;
const PRIVATE_WINDOWS_PATH = /^(?:[A-Za-z]:[/\\]Users[/\\]|[A-Za-z]:[/\\]home[/\\])/i;
const PRIVATE_COLLABORATION_HOSTS = ['private-collaboration-host', 'private-collaboration-host'];
const PRIVATE_HOST_SUFFIXES = [
  'corp', 'example', 'home', 'home.arpa', 'internal',
  'invalid', 'lan', 'local', 'localhost', 'onion', 'test'
];
const HTTP_URL = /https?:\/\/[^\s"'`<>)]+/gi;

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

function parsedHttpUrls(text) {
  const urls = text.match(HTTP_URL) || [];
  const parsed = [];
  for (const url of urls) {
    try {
      parsed.push(new URL(url));
    } catch {
      // Ignore values that look like URLs but are not parseable.
    }
  }
  return parsed;
}

function hostnameOf(url) {
  return url.hostname.toLowerCase().replace(/\.$/, '');
}

function hostEqualsOrPublicSuffix(host, domain) {
  return host === domain || host.endsWith(`.${domain}`);
}

function isPrivateAppMcpUrl(url) {
  const host = hostnameOf(url);
  if (host !== 'github.com' && host !== 'www.github.com') return false;
  const parts = url.pathname.split('/').filter(Boolean).map((part) => part.toLowerCase());
  return parts[0] === 'fulcrumapp' && parts[1] === 'app-mcp';
}

function privateCollaborationUrl(text) {
  return parsedHttpUrls(text).some((url) => {
    const host = hostnameOf(url);
    return (
      PRIVATE_COLLABORATION_HOSTS.some((domain) => hostEqualsOrPublicSuffix(host, domain)) ||
      isPrivateAppMcpUrl(url)
    );
  });
}

function publicUrl(text) {
  return parsedHttpUrls(text).some((parsed) => {
    const host = hostnameOf(parsed);
    if (!publicDnsName(host)) return false;
    const isNumeric = host.split('.').every((label) => /^(\d+|0x[0-9a-f]+)$/i.test(label));
    return !isNumeric && !host.includes(':');
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

  if (frontmatter && typeof frontmatter === 'object') {
    for (const field of Object.keys(frontmatter)) {
      if (!AGENT_SKILL_FIELDS.has(field)) {
        failures.push(`${relativePath}: unsupported Agent Skills frontmatter field "${field}"`);
      }
    }
  }

  if (frontmatter && frontmatter.name !== directoryName) {
    failures.push(`${relativePath}: frontmatter name does not match directory`);
  }

  const policyPath = path.join(path.dirname(skillPath), 'agents', 'openai.yaml');
  if (USER_INVOKED_SKILLS.has(directoryName)) {
    if (!fs.existsSync(policyPath)) {
      failures.push(`${repoRelativePath(policyPath)}: Codex invocation policy is missing`);
    } else {
      try {
        const config = YAML.parse(fs.readFileSync(policyPath, 'utf8'));
        if (config?.policy?.allow_implicit_invocation !== false) {
          failures.push(`${repoRelativePath(policyPath)}: allow_implicit_invocation must be false`);
        }
      } catch (err) {
        failures.push(`${repoRelativePath(policyPath)}: invalid YAML (${err.message.split('\n')[0].trim()})`);
      }
    }
  } else {
    if (fs.existsSync(policyPath)) {
      try {
        const config = YAML.parse(fs.readFileSync(policyPath, 'utf8'));
        if (config?.policy?.allow_implicit_invocation === false) {
          failures.push(`${repoRelativePath(policyPath)}: model-invoked skills must allow implicit invocation`);
        }
      } catch (err) {
        failures.push(`${repoRelativePath(policyPath)}: invalid YAML (${err.message.split('\n')[0].trim()})`);
      }
    }
  }

  if (text.includes('/private/skill-source')) {
    failures.push(`${relativePath}: contains a corporate absolute skill path`);
  }

  if (parsedHttpUrls(text).some(isPrivateAppMcpUrl)) {
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
  path.join(ROOT, '.github', 'plugin'),
  path.join(ROOT, '.agents', 'plugins'),
  PLUGIN_DIR,
  path.join(PLUGIN_DIR, '.claude-plugin'),
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

  if (privateCollaborationUrl(text) || privateFilesystemPath(text)) {
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

  const extension = path.extname(p).toLowerCase();
  if (isElementDiscriminatorContractPath(p, SKILLS_DIR) && ['.js', '.json'].includes(extension)) {
    try {
      if (containsGenericElementDiscriminator(text, extension)) {
        failures.push(`${relative}: Element is a generic schema name, not a valid field type discriminator`);
      }
    } catch (error) {
      failures.push(`${relative}: cannot inspect element discriminators (${error.message})`);
    }
  }
}

// 5. Manifest checks
const AGENT_PLUGIN_SCHEMA = 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json';
const AGENT_MCP_SCHEMA = 'https://agent-plugins.org/schemas/1.0.0/mcp.schema.json';
const AGENT_PLUGIN_FIELDS = new Set([
  '$schema',
  'name',
  'version',
  'description',
  'author',
  'homepage',
  'repository',
  'license',
  'keywords',
  'extensions'
]);
const AGENT_PLUGIN_NAME = /^(?!.*(?:--|\.\.))[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/;
const agentManifest = jsonDocuments[`${PLUGIN_RELATIVE_PATH}/plugin.json`];
if (!agentManifest || typeof agentManifest !== 'object' || Array.isArray(agentManifest)) {
  failures.push(`${PLUGIN_RELATIVE_PATH}/plugin.json: manifest must be a JSON object`);
} else {
  if (agentManifest.$schema !== AGENT_PLUGIN_SCHEMA) {
    failures.push(`${PLUGIN_RELATIVE_PATH}/plugin.json: $schema must identify Agent Plugins 1.0.0`);
  }
  for (const field of Object.keys(agentManifest)) {
    if (!AGENT_PLUGIN_FIELDS.has(field)) {
      failures.push(`${PLUGIN_RELATIVE_PATH}/plugin.json: unsupported top-level field "${field}"`);
    }
  }
  if (
    typeof agentManifest.name !== 'string' ||
    agentManifest.name.length < 1 ||
    agentManifest.name.length > 64 ||
    !AGENT_PLUGIN_NAME.test(agentManifest.name)
  ) {
    failures.push(`${PLUGIN_RELATIVE_PATH}/plugin.json: name does not satisfy Agent Plugins naming constraints`);
  }
  for (const field of ['version', 'description', 'homepage', 'repository', 'license']) {
    if (field in agentManifest && typeof agentManifest[field] !== 'string') {
      failures.push(`${PLUGIN_RELATIVE_PATH}/plugin.json: ${field} must be a string`);
    }
  }
  if (
    'keywords' in agentManifest &&
    (!Array.isArray(agentManifest.keywords) || agentManifest.keywords.some((keyword) => typeof keyword !== 'string'))
  ) {
    failures.push(`${PLUGIN_RELATIVE_PATH}/plugin.json: keywords must be an array of strings`);
  }
  if ('author' in agentManifest) {
    const author = agentManifest.author;
    const authorFields = new Set(['name', 'email', 'url']);
    if (!author || typeof author !== 'object' || Array.isArray(author)) {
      failures.push(`${PLUGIN_RELATIVE_PATH}/plugin.json: author must be an object`);
    } else {
      for (const field of Object.keys(author)) {
        if (!authorFields.has(field) || typeof author[field] !== 'string') {
          failures.push(`${PLUGIN_RELATIVE_PATH}/plugin.json: author fields must be name, email, or url strings`);
        }
      }
    }
  }
  if (
    'extensions' in agentManifest &&
    (!agentManifest.extensions ||
      typeof agentManifest.extensions !== 'object' ||
      Array.isArray(agentManifest.extensions) ||
      Object.values(agentManifest.extensions).some(
        (extension) => !extension || typeof extension !== 'object' || Array.isArray(extension)
      ))
  ) {
    failures.push(`${PLUGIN_RELATIVE_PATH}/plugin.json: extensions must map namespaces to objects`);
  }
}

const agentMcp = jsonDocuments[`${PLUGIN_RELATIVE_PATH}/mcp.json`];
if (!agentMcp || typeof agentMcp !== 'object' || Array.isArray(agentMcp)) {
  failures.push(`${PLUGIN_RELATIVE_PATH}/mcp.json: configuration must be a JSON object`);
} else {
  if (agentMcp.$schema !== AGENT_MCP_SCHEMA) {
    failures.push(`${PLUGIN_RELATIVE_PATH}/mcp.json: $schema must identify Agent Plugins MCP 1.0.0`);
  }
  if (
    !agentMcp.mcpServers ||
    typeof agentMcp.mcpServers !== 'object' ||
    Array.isArray(agentMcp.mcpServers)
  ) {
    failures.push(`${PLUGIN_RELATIVE_PATH}/mcp.json: mcpServers must be an object`);
  }
  for (const field of Object.keys(agentMcp)) {
    if (!['$schema', 'mcpServers'].includes(field)) {
      failures.push(`${PLUGIN_RELATIVE_PATH}/mcp.json: unsupported top-level field "${field}"`);
    }
  }
}

const portableMcpServers = agentMcp?.mcpServers;
if (
  !portableMcpServers ||
  typeof portableMcpServers !== 'object' ||
  Array.isArray(portableMcpServers) ||
  Object.keys(portableMcpServers).length !== 0
) {
  failures.push(
    `${PLUGIN_RELATIVE_PATH}/mcp.json: keep mcpServers empty; users must explicitly select their tenant endpoint`
  );
}

const setupPath = path.join(SKILLS_DIR, 'fulcrum-app-builder', 'resources', 'mcp-setup.md');
if (!fs.existsSync(setupPath)) {
  failures.push(`${repoRelativePath(setupPath)}: regional MCP setup guide is missing`);
} else {
  const setup = fs.readFileSync(setupPath, 'utf8');
  const endpointMappings = {
    'fulcrumapp.com': 'https://mcp.fulcrumapp.com',
    'fulcrumapp-au.com': 'https://mcp.fulcrumapp-au.com',
    'fulcrumapp-eu.com': 'https://mcp.fulcrumapp-eu.com',
    'fulcrumapp-ca.com': 'https://mcp.fulcrumapp-ca.com'
  };
  for (const [domain, endpoint] of Object.entries(endpointMappings)) {
    const mapping = `| \`${domain}\` | \`${endpoint}\` |`;
    if (!setup.includes(mapping)) {
      failures.push(`${repoRelativePath(setupPath)}: missing tenant-to-endpoint mapping for ${domain}`);
    }
  }
}

// Query MCP guidance contracts
const querySkillPath = path.join(SKILLS_DIR, 'fulcrum-query-api', 'SKILL.md');
const queryModelingPath = path.join(
  SKILLS_DIR,
  'fulcrum-query-api',
  'resources',
  'query-modeling-reference.md'
);
const reportSkillPath = path.join(SKILLS_DIR, 'fulcrum-report-building', 'SKILL.md');
const queryGuidancePaths = [querySkillPath, queryModelingPath];
for (const guidancePath of queryGuidancePaths) {
  if (!fs.existsSync(guidancePath)) {
    failures.push(`${repoRelativePath(guidancePath)}: Query guidance file is missing`);
  }
}
const queryGuidance = queryGuidancePaths
  .filter((p) => fs.existsSync(p))
  .map((p) => fs.readFileSync(p, 'utf8'))
  .join('\n');
const normalizedQueryGuidance = queryGuidance.replace(/\s+/g, ' ');

const queryWorkflowPurposes = [
  {
    purpose: 'list forms available to the authenticated user',
    pattern: /\b(?:list|discover|find)\b.{0,80}\bforms?\b.{0,80}\bavailable\b.{0,80}\bauthenticated user\b/i
  },
  {
    purpose: 'return Query table definitions for a selected form',
    pattern:
      /\b(?:return|discover|retrieve|get)\b.{0,80}\bQuery table (?:definitions|metadata|schemas?)\b.{0,80}\b(?:selected|intended|specified|chosen) form\b/i
  },
  {
    purpose: 'execute read-only Query SQL',
    pattern: /\b(?:execute|run|submit|pass)\b.{0,80}\bread-only\b.{0,80}\b(?:Query )?SQL\b/i
  }
];
for (const { purpose, pattern } of queryWorkflowPurposes) {
  if (!pattern.test(normalizedQueryGuidance)) {
    failures.push(
      `${repoRelativePath(querySkillPath)}: document the stable Query MCP workflow purpose "${purpose}"`
    );
  }
}
if (!/live (?:Fulcrum MCP )?gateway schemas.{0,120}(?:authoritative|govern)/i.test(normalizedQueryGuidance)) {
  failures.push(`${repoRelativePath(querySkillPath)}: live gateway schemas must own exact Query MCP contracts`);
}
if (!/read-only/i.test(queryGuidance) || !/single line|single-line/i.test(queryGuidance)) {
  failures.push(`${repoRelativePath(querySkillPath)}: require read-only, single-line Query MCP SQL`);
}
if (!/LIMIT 100/i.test(queryGuidance) || !/explor/i.test(queryGuidance)) {
  failures.push(`${repoRelativePath(querySkillPath)}: require LIMIT 100 for exploratory queries`);
}
if (
  !/confirm/i.test(queryGuidance) ||
  !/broad-column|broad column|SELECT \*/i.test(queryGuidance) ||
  !/personal/i.test(queryGuidance) ||
  !/location/i.test(queryGuidance) ||
  !/media/i.test(queryGuidance)
) {
  failures.push(`${repoRelativePath(querySkillPath)}: require confirmation for broad and sensitive retrieval`);
}
if (/direct Query API.{0,100}(?:fallback|hand ?off)/i.test(normalizedQueryGuidance)) {
  failures.push(`${repoRelativePath(querySkillPath)}: do not add a direct Query API execution fallback`);
}
if (!/Query MCP tools are unavailable.{0,160}execution is unavailable/i.test(normalizedQueryGuidance)) {
  failures.push(`${repoRelativePath(querySkillPath)}: fail clearly when Query MCP execution is unavailable`);
}
if (fs.existsSync(reportSkillPath)) {
  const reportGuidance = fs.readFileSync(reportSkillPath, 'utf8').replace(/\s+/g, ' ');
  if (!/Report Builder `QUERY\(\)`.{0,160}distinct from Query MCP `query_records`/i.test(reportGuidance)) {
    failures.push(`${repoRelativePath(reportSkillPath)}: distinguish Report Builder QUERY() from Query MCP query_records`);
  }
}

const rootClaudeManifestPath = '.claude-plugin/plugin.json';
const rootClaudeManifest = jsonDocuments[rootClaudeManifestPath];
if (rootClaudeManifest?.skills !== `./${PLUGIN_RELATIVE_PATH}/skills/`) {
  failures.push(`${rootClaudeManifestPath}: skills must point to ./${PLUGIN_RELATIVE_PATH}/skills/`);
}

const claudeManifestPaths = [
  rootClaudeManifestPath,
  `${PLUGIN_RELATIVE_PATH}/.claude-plugin/plugin.json`
];
for (const relativePath of claudeManifestPaths) {
  if ('$schema' in (jsonDocuments[relativePath] ?? {})) {
    failures.push(`${relativePath}: omit $schema because Claude rejects unknown top-level fields`);
  }
}

for (const relativePath of [
  ...claudeManifestPaths,
  `${PLUGIN_RELATIVE_PATH}/gemini-extension.json`
]) {
  const manifest = jsonDocuments[relativePath];
  if (!manifest || !agentManifest?.version || manifest.version !== agentManifest.version) {
    failures.push(`${relativePath}: version must match the root plugin manifest`);
  }
}

const copilotMarketplace = jsonDocuments['.github/plugin/marketplace.json'];
if (
  !agentManifest?.version ||
  copilotMarketplace?.metadata?.version !== agentManifest.version ||
  copilotMarketplace?.plugins?.[0]?.version !== agentManifest.version
) {
  failures.push('.github/plugin/marketplace.json: marketplace and plugin versions must match the root plugin manifest');
}

const rootLicensePath = path.join(ROOT, 'LICENSE');
const packageLicensePath = path.join(PLUGIN_DIR, 'LICENSE');
if (!fs.existsSync(rootLicensePath) || !fs.existsSync(packageLicensePath)) {
  failures.push('LICENSE: include the MIT license in both the repository and distributable package');
} else {
  const license = fs.readFileSync(rootLicensePath, 'utf8');
  if (!license.startsWith('MIT License\n') || fs.readFileSync(packageLicensePath, 'utf8') !== license) {
    failures.push(`${PLUGIN_RELATIVE_PATH}/LICENSE: must contain the same MIT license text as the repository`);
  }
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
  if (privateCollaborationUrl(exampleText) || privateFilesystemPath(exampleText)) {
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
