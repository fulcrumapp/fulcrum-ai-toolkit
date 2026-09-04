// OpenAPI component schema validation for externalized JSON examples and assets.
//
// Pulls schemas dynamically from the official Fulcrum OpenAPI reference:
// https://raw.githubusercontent.com/fulcrumapp/api/v2/reference/rest-api.json
// Keep the fetched document in memory only. Do not write network bytes to
// disk. Override with OPENAPI_SPEC_PATH when a local spec file is available.

import fs from 'node:fs';
import process from 'node:process';

import Ajv from 'ajv';
import addFormats from 'ajv-formats';

export const OFFICIAL_OPENAPI_URL =
  'https://raw.githubusercontent.com/fulcrumapp/api/v2/reference/rest-api.json';

let cachedSchemas = null;

function schemasFromSpec(raw) {
  const schemas = raw?.components?.schemas || raw;
  if (!schemas || typeof schemas !== 'object' || Array.isArray(schemas)) {
    throw new Error('No components.schemas found in OpenAPI document');
  }
  return schemas;
}

export async function loadSchemas() {
  if (cachedSchemas) return cachedSchemas;

  if (process.env.OPENAPI_SPEC_PATH) {
    try {
      const raw = JSON.parse(fs.readFileSync(process.env.OPENAPI_SPEC_PATH, 'utf8'));
      cachedSchemas = schemasFromSpec(raw);
      return cachedSchemas;
    } catch (error) {
      throw new Error(
        `Failed to load OpenAPI spec from OPENAPI_SPEC_PATH (${process.env.OPENAPI_SPEC_PATH}): ${error.message}`
      );
    }
  }

  try {
    const response = await fetch(OFFICIAL_OPENAPI_URL);
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

function resolveRef(ref, schemas) {
  const prefix = '#/components/schemas/';
  if (ref && ref.startsWith(prefix)) {
    return schemas[ref.slice(prefix.length)];
  }
  return null;
}

function getAllowedProperties(schema, schemas) {
  if (!schema) return new Set();
  if (schema.$ref) return getAllowedProperties(resolveRef(schema.$ref, schemas), schemas);
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

function checkClosedSet(document, schema, schemas, path = '$') {
  if (!document || typeof document !== 'object' || Array.isArray(document)) return [];

  const errors = [];
  const allowed = getAllowedProperties(schema, schemas);

  if (allowed.size > 0 && schema.additionalProperties !== true) {
    for (const key of Object.keys(document)) {
      if (!allowed.has(key)) {
        errors.push(`${path}: undocumented property "${key}"`);
      }
    }
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
