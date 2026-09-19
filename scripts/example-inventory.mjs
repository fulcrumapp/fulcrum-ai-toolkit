import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const EXAMPLE_INVENTORY_RELATIVE_PATH = path.join(
  'test',
  'data',
  'example-block-inventory.json'
);
export const EXAMPLE_COVERAGE_RELATIVE_PATH = path.join(
  'plugins',
  'fulcrum-ai-toolkit',
  'docs',
  'legacy-example-coverage.md'
);

const LEGACY_DISPOSITIONS = new Set([
  'drop',
  'rewrite',
  'externalized',
  'merged',
  'private',
  'stale'
]);
const REPORT_TEMPLATE_KINDS = new Set(['document', 'fragment']);

function safeRelativePath(candidate) {
  if (typeof candidate !== 'string' || candidate.length === 0 || path.isAbsolute(candidate)) {
    return false;
  }
  const normalized = path.posix.normalize(candidate.replaceAll('\\', '/'));
  return normalized === candidate.replaceAll('\\', '/') && !normalized.startsWith('../') && normalized !== '..';
}

function existingFile(root, relativePath, allowPluginFallback = false) {
  if (!safeRelativePath(relativePath)) return false;
  const candidates = [relativePath];
  if (allowPluginFallback) {
    candidates.push(path.join('plugins', 'fulcrum-ai-toolkit', relativePath));
  }
  return candidates.some((candidate) => {
    const absolutePath = path.resolve(root, candidate);
    return absolutePath.startsWith(`${path.resolve(root)}${path.sep}`) &&
      fs.existsSync(absolutePath) &&
      fs.statSync(absolutePath).isFile();
  });
}

function parseLegacyCoverageRows(text) {
  const rows = new Map();
  for (const line of text.split('\n')) {
    const match = line.match(/^\|\s*(L\d+)\s*\|/);
    if (!match) continue;
    const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
    rows.set(match[1], {
      disposition: cells[2]?.replaceAll('`', '')
    });
  }
  return rows;
}

function validateUnitTargets(root, units, label, sourcePrefix = '') {
  const failures = [];
  const seenIds = new Set();

  if (!Array.isArray(units)) {
    return [`${label} must be an array`];
  }

  for (const unit of units) {
    if (!unit || typeof unit !== 'object') {
      failures.push(`${label} contains a non-object entry`);
      continue;
    }
    if (typeof unit.id !== 'string' || seenIds.has(unit.id)) {
      failures.push(`${label} contains a missing or duplicate id`);
    } else {
      seenIds.add(unit.id);
    }
    const targets = Array.isArray(unit.targets)
      ? unit.targets
      : typeof unit.target === 'string'
        ? [unit.target]
        : [];
    if (targets.length === 0) {
      failures.push(`${label} ${unit.id ?? '<unknown>'} must declare targets`);
    } else {
      for (const target of targets) {
        if (!existingFile(root, target, true)) {
          failures.push(`${label} ${unit.id ?? '<unknown>'} target is missing or unsafe: ${target}`);
        }
      }
    }
    if (sourcePrefix && (typeof unit.source !== 'string' ||
      (!existingFile(root, path.join(sourcePrefix, unit.source)) &&
        !existingFile(root, path.join('plugins', 'fulcrum-ai-toolkit', sourcePrefix, unit.source))))) {
      failures.push(`${label} ${unit.id ?? '<unknown>'} source is missing or unsafe: ${unit.source}`);
    }
    if (sourcePrefix && (!Number.isInteger(unit.ordinal) || unit.ordinal < 1)) {
      failures.push(`${label} ${unit.id ?? '<unknown>'} ordinal must be a positive integer`);
    }
  }

  return failures;
}

export function validateExampleBlockInventory(root) {
  const failures = [];
  const inventoryPath = path.join(root, EXAMPLE_INVENTORY_RELATIVE_PATH);
  const coveragePath = path.join(root, EXAMPLE_COVERAGE_RELATIVE_PATH);
  let inventory;
  let coverageText;

  try {
    inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
  } catch (error) {
    return [`${EXAMPLE_INVENTORY_RELATIVE_PATH}: invalid JSON (${error.message})`];
  }

  try {
    coverageText = fs.readFileSync(coveragePath, 'utf8');
  } catch (error) {
    failures.push(`${EXAMPLE_COVERAGE_RELATIVE_PATH}: cannot read coverage manifest (${error.message})`);
  }

  const legacyUnits = inventory.legacy_units;
  failures.push(...validateUnitTargets(root, legacyUnits, 'legacy_units'));
  for (const unit of legacyUnits ?? []) {
    if (unit && !LEGACY_DISPOSITIONS.has(unit.disposition)) {
      failures.push(`legacy_units ${unit.id ?? '<unknown>'} has invalid disposition: ${unit.disposition}`);
    }
  }

  const currentBlocks = inventory.current_blocks;
  failures.push(...validateUnitTargets(root, currentBlocks, 'current_blocks', 'skills'));

  if (coverageText !== undefined && Array.isArray(legacyUnits)) {
    const coverageRows = parseLegacyCoverageRows(coverageText);
    const inventoryIds = legacyUnits.map((unit) => unit.id).sort();
    const coverageIds = [...coverageRows.keys()].sort();
    if (JSON.stringify(inventoryIds) !== JSON.stringify(coverageIds)) {
      failures.push(`${EXAMPLE_COVERAGE_RELATIVE_PATH}: legacy unit IDs do not match the inventory`);
    }
    for (const unit of legacyUnits) {
      const row = coverageRows.get(unit.id);
      if (row && row.disposition !== unit.disposition) {
        failures.push(
          `${EXAMPLE_COVERAGE_RELATIVE_PATH}: ${unit.id} disposition does not match the inventory`
        );
      }
    }
  }

  if (!Array.isArray(inventory.report_templates)) {
    failures.push('report_templates must be an array');
  } else {
    const seenPaths = new Set();
    for (const template of inventory.report_templates) {
      if (!template || typeof template !== 'object') {
        failures.push('report_templates contains a non-object entry');
        continue;
      }
      const relativePath = template.path;
      if (seenPaths.has(relativePath)) {
        failures.push(`report_templates contains a duplicate path: ${relativePath}`);
        continue;
      }
      seenPaths.add(relativePath);
      if (!existingFile(root, relativePath)) {
        failures.push(`report_templates path is missing or unsafe: ${relativePath}`);
        continue;
      }
      if (!REPORT_TEMPLATE_KINDS.has(template.kind)) {
        failures.push(`report_templates ${relativePath} has invalid kind: ${template.kind}`);
      }
      if (!/^[a-f0-9]{64}$/.test(template.sha256 ?? '')) {
        failures.push(`report_templates ${relativePath} has an invalid SHA-256`);
        continue;
      }
      const actualHash = crypto
        .createHash('sha256')
        .update(fs.readFileSync(path.join(root, relativePath)))
        .digest('hex');
      if (actualHash !== template.sha256) {
        failures.push(`report_templates ${relativePath} SHA-256 does not match its contents`);
      }
    }
  }

  return failures;
}
