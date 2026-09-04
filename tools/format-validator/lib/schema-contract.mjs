// OpenAPI component schema validation for externalized JSON examples and assets.
//
// Pulls schemas dynamically from the official Fulcrum OpenAPI reference:
// https://raw.githubusercontent.com/fulcrumapp/api/v2/reference/rest-api.json
// Caches to node_modules/.cache to avoid redundant network round-trips.

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.resolve(HERE, '..', 'node_modules', '.cache');
const CACHE_FILE = path.join(CACHE_DIR, 'fulcrum-openapi-schemas.json');

export const OFFICIAL_OPENAPI_URL =
  'https://raw.githubusercontent.com/fulcrumapp/api/v2/reference/rest-api.json';

let cachedSchemas = null;

export async function loadSchemas() {
  if (cachedSchemas) return cachedSchemas;

  if (process.env.OPENAPI_SPEC_PATH && fs.existsSync(process.env.OPENAPI_SPEC_PATH)) {
    const raw = JSON.parse(fs.readFileSync(process.env.OPENAPI_SPEC_PATH, 'utf8'));
    cachedSchemas = raw.components?.schemas || raw;
    return cachedSchemas;
  }

  if (fs.existsSync(CACHE_FILE)) {
    try {
      cachedSchemas = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
      return cachedSchemas;
    } catch {
      // Cache unreadable; refetch below
    }
  }

  try {
    const response = await fetch(OFFICIAL_OPENAPI_URL);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }
    const spec = await response.json();
    cachedSchemas = spec.components?.schemas;
    if (!cachedSchemas) {
      throw new Error('No components.schemas found in OpenAPI document');
    }

    try {
      if (!fs.existsSync(CACHE_DIR)) {
        fs.mkdirSync(CACHE_DIR, { recursive: true });
      }
      fs.writeFileSync(CACHE_FILE, JSON.stringify(cachedSchemas), 'utf8');
    } catch {
      // Non-fatal cache write failure
    }

    return cachedSchemas;
  } catch (error) {
    throw new Error(
      `Failed to load official OpenAPI spec from ${OFFICIAL_OPENAPI_URL}: ${error.message}`
    );
  }
}

export const SCHEMA_MAPPINGS = {
  'plugins/fulcrum-ai-toolkit/skills/fulcrum-app-design/assets/record-link-field.json':
    'FormRecordLinkFieldElement'
};

export const NON_OPENAPI_JSON = {};

let ajvInstance = null;

function getAjv(schemas) {
  if (ajvInstance) return ajvInstance;

  const ajv = new Ajv({
    allErrors: true,
    strict: false
  });
  addFormats(ajv);

  for (const [name, schema] of Object.entries(schemas)) {
    ajv.addSchema(schema, `#/components/schemas/${name}`);
  }

  ajvInstance = ajv;
  return ajvInstance;
}

export function validateDocument(document, schemaName, schemas = cachedSchemas) {
  if (!schemas) {
    throw new Error('OpenAPI schemas must be loaded before calling validateDocument');
  }

  const schema = schemas[schemaName];
  if (!schema) {
    return [`OpenAPI component schema "${schemaName}" does not exist`];
  }

  const ajv = getAjv(schemas);
  const validate = ajv.compile(schema);
  const valid = validate(document);

  if (valid) return [];

  return (validate.errors || []).map(
    (err) => `${err.instancePath || '$'}: ${err.message}`
  );
}

export function validateInventory(discoveredPaths) {
  const errors = [];
  const configuredPaths = new Set([...Object.keys(SCHEMA_MAPPINGS), ...Object.keys(NON_OPENAPI_JSON)]);
  const discoveredSet = new Set(discoveredPaths);

  for (const discovered of discoveredPaths) {
    if (!configuredPaths.has(discovered)) {
      errors.push(`${discovered}: JSON example must map to an OpenAPI component schema or have an explicit NON_OPENAPI_JSON reason`);
    }
  }

  for (const configured of configuredPaths) {
    if (!discoveredSet.has(configured)) {
      errors.push(`${configured}: configured JSON example does not exist`);
    }
  }

  for (const mapped of Object.keys(SCHEMA_MAPPINGS)) {
    if (mapped in NON_OPENAPI_JSON) {
      errors.push(`${mapped}: cannot be both schema-mapped and excluded`);
    }
  }

  for (const [excluded, reason] of Object.entries(NON_OPENAPI_JSON)) {
    if (!reason || !reason.trim()) {
      errors.push(`${excluded}: NON_OPENAPI_JSON reason must be specific`);
    }
  }

  return errors;
}
