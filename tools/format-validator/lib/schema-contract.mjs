// OpenAPI component schema validation for externalized JSON examples and assets.
//
// This validator verifies that JSON examples match vendored OpenAPI component
// schemas and flags undocumented properties. It executes no code and runs
// entirely in Node.js.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCHEMAS_FILE = path.resolve(HERE, '..', 'schemas', 'openapi-schemas.json');

let cachedSchemas = null;

function loadSchemas() {
  if (!cachedSchemas) {
    cachedSchemas = JSON.parse(fs.readFileSync(SCHEMAS_FILE, 'utf8'));
  }
  return cachedSchemas;
}

export const SCHEMA_MAPPINGS = {
  'plugins/fulcrum-ai-toolkit/skills/fulcrum-app-design/assets/record-link-field.json':
    'FormRecordLinkFieldElement'
};

export const NON_OPENAPI_JSON = {};

function resolveRef(ref, schemas) {
  const prefix = '#/components/schemas/';
  if (ref.startsWith(prefix)) {
    const name = ref.slice(prefix.length);
    if (schemas[name]) return schemas[name];
    throw new Error(`Referenced schema not found: ${ref}`);
  }
  throw new Error(`Unsupported schema reference: ${ref}`);
}

function resolveSchema(schema, schemas) {
  if (schema && typeof schema === 'object' && schema.$ref) {
    return resolveRef(schema.$ref, schemas);
  }
  return schema;
}

function collectPropertyNames(schema, schemas) {
  const resolved = resolveSchema(schema, schemas);
  if (!resolved || typeof resolved !== 'object') return [];
  const names = new Set(Object.keys(resolved.properties || {}));
  if (Array.isArray(resolved.allOf)) {
    for (const sub of resolved.allOf) {
      for (const name of collectPropertyNames(sub, schemas)) {
        names.add(name);
      }
    }
  }
  return [...names];
}

function isNullable(schema) {
  return schema.nullable === true || (Array.isArray(schema.type) && schema.type.includes('null'));
}

function matchesType(value, type) {
  if (type === 'null') return value === null;
  if (type === 'object') return value !== null && typeof value === 'object' && !Array.isArray(value);
  if (type === 'array') return Array.isArray(value);
  if (type === 'string') return typeof value === 'string';
  if (type === 'integer') return typeof value === 'number' && Number.isInteger(value);
  if (type === 'number') return typeof value === 'number';
  if (type === 'boolean') return typeof value === 'boolean';
  return false;
}

function formatJsonType(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'number';
  return typeof value;
}

export function validateDocument(document, schemaName, schemas = loadSchemas()) {
  const schema = schemas[schemaName];
  if (!schema) {
    return [`OpenAPI component schema "${schemaName}" does not exist`];
  }
  return validateValue(document, schema, '$', schemas, { strictProperties: true });
}

function validateValue(value, rawSchema, path, schemas, options) {
  const schema = resolveSchema(rawSchema, schemas);
  if (schema === true) return [];
  if (schema === false) return [`${path}: schema rejects every value`];

  if (value === null) {
    if (isNullable(schema)) return [];
    return [`${path}: null is not allowed`];
  }

  const errors = [];

  // Compositions
  if (Array.isArray(schema.allOf)) {
    const allowed = options.allowedProperties || collectPropertyNames(schema, schemas);
    for (const sub of schema.allOf) {
      errors.push(...validateValue(value, sub, path, schemas, { ...options, allowedProperties: allowed }));
    }
  }

  if (Array.isArray(schema.anyOf)) {
    const matches = schema.anyOf.some((sub) => validateValue(value, sub, path, schemas, options).length === 0);
    if (!matches) errors.push(`${path}: does not match any allowed schema`);
  }

  if (Array.isArray(schema.oneOf)) {
    const matchCount = schema.oneOf.filter((sub) => validateValue(value, sub, path, schemas, options).length === 0).length;
    if (matchCount !== 1) {
      errors.push(`${path}: must match exactly one allowed schema (matched ${matchCount})`);
    }
  }

  // Enum
  if (Array.isArray(schema.enum) && !schema.enum.includes(value)) {
    errors.push(`${path}: ${JSON.stringify(value)} is not one of ${schema.enum.map((v) => JSON.stringify(v)).join(', ')}`);
  }

  // Type check
  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type.filter((t) => t !== null) : [schema.type];
    if (types.length > 0 && !types.some((t) => matchesType(value, t))) {
      errors.push(`${path}: expected ${types.join(' or ')}, got ${formatJsonType(value)}`);
      return errors;
    }
  }

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const properties = schema.properties || {};
    const allowedProperties = options.allowedProperties || collectPropertyNames(schema, schemas);

    if (Array.isArray(schema.required)) {
      for (const requiredName of schema.required) {
        if (!(requiredName in value)) {
          errors.push(`${path}: missing required property "${requiredName}"`);
        }
      }
    }

    for (const [propName, propVal] of Object.entries(value)) {
      if (propName in properties) {
        errors.push(...validateValue(propVal, properties[propName], `${path}.${propName}`, schemas, options));
      } else if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
        errors.push(...validateValue(propVal, schema.additionalProperties, `${path}.${propName}`, schemas, options));
      }
    }

    if (options.strictProperties && Object.keys(properties).length > 0 && schema.additionalProperties !== true) {
      const allowedSet = new Set(allowedProperties);
      for (const key of Object.keys(value).sort()) {
        if (!allowedSet.has(key)) {
          errors.push(`${path}: undocumented property "${key}"`);
        }
      }
    } else if (schema.additionalProperties === false) {
      const propSet = new Set(Object.keys(properties));
      for (const key of Object.keys(value).sort()) {
        if (!propSet.has(key)) {
          errors.push(`${path}: additional property "${key}" is not allowed`);
        }
      }
    }
  } else if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      errors.push(`${path}: expected at least ${schema.minItems} items`);
    }
    if (schema.maxItems !== undefined && value.length > schema.maxItems) {
      errors.push(`${path}: expected at most ${schema.maxItems} items`);
    }
    if (schema.items) {
      value.forEach((item, index) => {
        errors.push(...validateValue(item, schema.items, `${path}[${index}]`, schemas, options));
      });
    }
  } else if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push(`${path}: is shorter than ${schema.minLength} characters`);
    }
    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      errors.push(`${path}: is longer than ${schema.maxLength} characters`);
    }
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
      errors.push(`${path}: does not match pattern ${schema.pattern}`);
    }
  } else if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push(`${path}: must be at least ${schema.minimum}`);
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      errors.push(`${path}: must be at most ${schema.maximum}`);
    }
  }

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
