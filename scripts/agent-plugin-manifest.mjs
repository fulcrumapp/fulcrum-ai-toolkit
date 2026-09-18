const AGENT_PLUGIN_SCHEMA = 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json';
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
const EXTENSION_NAMESPACE = /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function validateAgentPluginManifest(manifest, relativePath = 'plugin.json') {
  const failures = [];
  const addFailure = (message) => failures.push(`${relativePath}: ${message}`);

  if (!isObject(manifest)) {
    addFailure('manifest must be a JSON object');
    return failures;
  }

  if (manifest.$schema !== AGENT_PLUGIN_SCHEMA) {
    addFailure('$schema must identify Agent Plugins 1.0.0');
  }

  for (const field of Object.keys(manifest)) {
    if (!AGENT_PLUGIN_FIELDS.has(field)) {
      addFailure(`unsupported top-level field "${field}"`);
    }
  }

  if (
    typeof manifest.name !== 'string' ||
    Array.from(manifest.name).length < 1 ||
    Array.from(manifest.name).length > 64 ||
    !AGENT_PLUGIN_NAME.test(manifest.name)
  ) {
    addFailure('name does not satisfy Agent Plugins naming constraints');
  }

  for (const field of ['version', 'description', 'homepage', 'repository', 'license']) {
    if (field in manifest && typeof manifest[field] !== 'string') {
      addFailure(`${field} must be a string`);
    }
  }

  if (
    'keywords' in manifest &&
    (!Array.isArray(manifest.keywords) || manifest.keywords.some((keyword) => typeof keyword !== 'string'))
  ) {
    addFailure('keywords must be an array of strings');
  }

  if ('author' in manifest) {
    if (!isObject(manifest.author)) {
      addFailure('author must be an object');
    } else {
      for (const [field, value] of Object.entries(manifest.author)) {
        if (!['name', 'email', 'url'].includes(field) || typeof value !== 'string') {
          addFailure('author fields must be name, email, or url strings');
        }
      }
    }
  }

  if ('extensions' in manifest) {
    if (!isObject(manifest.extensions)) {
      addFailure('extensions must map namespaces to objects');
    } else {
      for (const [namespace, extension] of Object.entries(manifest.extensions)) {
        if (!EXTENSION_NAMESPACE.test(namespace)) {
          addFailure(`extension key "${namespace}" must be a reverse-domain namespace`);
        }
        if (!isObject(extension)) {
          addFailure(`extension "${namespace}" must be an object`);
        }
      }
    }
  }

  return failures;
}
