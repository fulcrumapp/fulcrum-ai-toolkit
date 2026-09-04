// OpenAPI component schema validation for externalized JSON examples and assets.
//
// Default source is the checked-in subset of the official Fulcrum REST API
// OpenAPI document. Override with OPENAPI_SPEC_PATH. Network fetch of the
// official spec is opt-in via OPENAPI_FETCH=1 and never writes the response
// to disk.

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const HERE = path.dirname(fileURLToPath(import.meta.url));

export const VENDORED_OPENAPI_SPEC_PATH = path.resolve(
  HERE,
  '..',
  'schemas',
  'fulcrum-rest-api.json'
);

export const OFFICIAL_OPENAPI_URL =
  'https://raw.githubusercontent.com/fulcrumapp/api/v2/reference/rest-api.json';
export const OPENAPI_FETCH_TIMEOUT_MS = 30_000;

let cachedSchemas = null;

function schemasFromSpec(raw) {
  const schemas = raw?.components?.schemas || raw;
  if (!schemas || typeof schemas !== 'object' || Array.isArray(schemas)) {
    throw new Error('No components.schemas found in OpenAPI document');
  }
  return schemas;
}

function readSpecFile(filePath, label) {
  try {
    return schemasFromSpec(JSON.parse(fs.readFileSync(filePath, 'utf8')));
  } catch (error) {
    throw new Error(`Failed to load OpenAPI spec from ${label} (${filePath}): ${error.message}`);
  }
}

export async function loadSchemas() {
  if (cachedSchemas) return cachedSchemas;

  if (process.env.OPENAPI_SPEC_PATH) {
    cachedSchemas = readSpecFile(process.env.OPENAPI_SPEC_PATH, 'OPENAPI_SPEC_PATH');
    return cachedSchemas;
  }

  if (process.env.OPENAPI_FETCH === '1') {
    try {
      const response = await fetch(OFFICIAL_OPENAPI_URL, {
        signal: AbortSignal.timeout(OPENAPI_FETCH_TIMEOUT_MS)
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }
      cachedSchemas = schemasFromSpec(await response.json());
      return cachedSchemas;
    } catch (error) {
      throw new Error(
        `Failed to load official OpenAPI spec from ${OFFICIAL_OPENAPI_URL}: ${error.message}`
      );
    }
  }

  cachedSchemas = readSpecFile(VENDORED_OPENAPI_SPEC_PATH, 'vendored OpenAPI subset');
  return cachedSchemas;
}

export const SCHEMA_MAPPINGS = {
  'plugins/fulcrum-ai-toolkit/skills/fulcrum-app-design/assets/record-link-field.json':
    'FormRecordLinkFieldElement'
};

export const NON_OPENAPI_JSON = {};

const ajvBySchemas = new WeakMap();

function getAjv(schemas) {
  const existing = ajvBySchemas.get(schemas);
  if (existing) return existing;

  const ajv = new Ajv({
    allErrors: true,
    strict: false
  });
  addFormats(ajv);

  for (const [name, schema] of Object.entries(schemas)) {
    ajv.addSchema(schema, `#/components/schemas/${name}`);
  }

  ajvBySchemas.set(schemas, ajv);
  return ajv;
}

function resolveRef(ref, schemas) {
  const prefix = '#/components/schemas/';
  if (ref && ref.startsWith(prefix)) {
    return schemas[ref.slice(prefix.length)];
  }
  return null;
}

function deref(schema, schemas, seen = new Set()) {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) return schema;
  const ref = schema.$ref;
  if (!ref) return schema;
  if (seen.has(ref)) return schema;
  seen.add(ref);
  return deref(resolveRef(ref, schemas), schemas, seen);
}

function getAllowedProperties(schema, schemas) {
  schema = deref(schema, schemas);
  if (!schema) return new Set();
  const props = new Set(Object.keys(schema.properties || {}));
  if (Array.isArray(schema.allOf)) {
    for (const sub of schema.allOf) {
      for (const p of getAllowedProperties(sub, schemas)) {
        props.add(p);
      }
    }
  }
  return props;
}

function getPropertySchema(schema, key, schemas) {
  schema = deref(schema, schemas);
  if (!schema) return null;
  if (schema.properties && Object.prototype.hasOwnProperty.call(schema.properties, key)) {
    return schema.properties[key];
  }
  if (Array.isArray(schema.allOf)) {
    for (const sub of schema.allOf) {
      const found = getPropertySchema(sub, key, schemas);
      if (found) return found;
    }
  }
  return null;
}

function getItemsSchema(schema, schemas) {
  schema = deref(schema, schemas);
  if (!schema) return null;
  if (schema.items) return schema.items;
  if (Array.isArray(schema.allOf)) {
    for (const sub of schema.allOf) {
      const found = getItemsSchema(sub, schemas);
      if (found) return found;
    }
  }
  return null;
}

function checkClosedSet(document, schema, schemas, path = '$') {
  schema = deref(schema, schemas);
  if (!schema) return [];

  if (Array.isArray(document)) {
    const itemSchema = getItemsSchema(schema, schemas);
    if (!itemSchema) return [];
    const errors = [];
    for (let index = 0; index < document.length; index += 1) {
      errors.push(...checkClosedSet(document[index], itemSchema, schemas, `${path}[${index}]`));
    }
    return errors;
  }

  if (!document || typeof document !== 'object') return [];

  const errors = [];
  const allowed = getAllowedProperties(schema, schemas);

  if (allowed.size > 0 && schema.additionalProperties !== true) {
    for (const key of Object.keys(document)) {
      if (!allowed.has(key)) {
        errors.push(`${path}: undocumented property "${key}"`);
      }
    }
  }

  for (const key of Object.keys(document)) {
    const childSchema = getPropertySchema(schema, key, schemas);
    if (!childSchema) continue;
    errors.push(...checkClosedSet(document[key], childSchema, schemas, `${path}.${key}`));
  }

  return errors;
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

  const errors = [];
  if (!valid && validate.errors) {
    for (const err of validate.errors) {
      errors.push(`${err.instancePath || '$'}: ${err.message}`);
    }
  }

  // Treat documented properties as a closed set for example files
  errors.push(...checkClosedSet(document, schema, schemas));

  return errors;
}

export function validateInventory(
  discoveredPaths,
  mappings = SCHEMA_MAPPINGS,
  excluded = NON_OPENAPI_JSON
) {
  const errors = [];
  const configuredPaths = new Set([...Object.keys(mappings), ...Object.keys(excluded)]);
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

  for (const mapped of Object.keys(mappings)) {
    if (mapped in excluded) {
      errors.push(`${mapped}: cannot be both schema-mapped and excluded`);
    }
  }

  for (const [excludedPath, reason] of Object.entries(excluded)) {
    if (!reason || !reason.trim()) {
      errors.push(`${excludedPath}: NON_OPENAPI_JSON reason must be specific`);
    }
  }

  return errors;
}
