const AGENT_SKILL_FIELDS = new Set([
  'name',
  'description',
  'license',
  'compatibility',
  'metadata',
  'allowed-tools'
]);

const SKILL_NAME_PATTERN = /^(?!-)(?!.*--)[a-z0-9-]{1,64}(?<!-)$/;

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

export function validateAgentSkillFrontmatter(frontmatter, relativePath, directoryName) {
  const failures = [];
  const addFailure = (message) => failures.push(`${relativePath}: ${message}`);

  if (!frontmatter || typeof frontmatter !== 'object' || Array.isArray(frontmatter)) {
    addFailure('frontmatter must be a YAML mapping');
    return failures;
  }

  for (const field of Object.keys(frontmatter)) {
    if (!AGENT_SKILL_FIELDS.has(field)) {
      addFailure(`unsupported Agent Skills frontmatter field "${field}"`);
    }
  }

  if (typeof frontmatter.name !== 'string' || frontmatter.name.length === 0) {
    addFailure('frontmatter name must be a non-empty string');
  } else {
    if (frontmatter.name.length > 64 || !SKILL_NAME_PATTERN.test(frontmatter.name)) {
      addFailure(
        'frontmatter name must be 1-64 characters using lowercase letters, numbers, and hyphens, without leading, trailing, or consecutive hyphens'
      );
    }
    if (frontmatter.name !== directoryName) {
      addFailure('frontmatter name does not match directory');
    }
  }

  if (typeof frontmatter.description !== 'string' || frontmatter.description.length === 0) {
    addFailure('frontmatter description must be a non-empty string');
  } else if (frontmatter.description.length > 1024) {
    addFailure('frontmatter description must be at most 1024 characters');
  }

  if (hasOwn(frontmatter, 'license') && typeof frontmatter.license !== 'string') {
    addFailure('frontmatter license must be a string');
  }

  if (hasOwn(frontmatter, 'compatibility')) {
    if (typeof frontmatter.compatibility !== 'string' || frontmatter.compatibility.length === 0) {
      addFailure('frontmatter compatibility must be a non-empty string');
    } else if (frontmatter.compatibility.length > 500) {
      addFailure('frontmatter compatibility must be at most 500 characters');
    }
  }

  if (hasOwn(frontmatter, 'metadata')) {
    const metadata = frontmatter.metadata;
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      addFailure('frontmatter metadata must be a mapping of string keys to string values');
    } else {
      for (const [key, value] of Object.entries(metadata)) {
        if (typeof value !== 'string') {
          addFailure(`frontmatter metadata value for "${key}" must be a string`);
        }
      }
    }
  }

  if (hasOwn(frontmatter, 'allowed-tools') && typeof frontmatter['allowed-tools'] !== 'string') {
    addFailure('frontmatter allowed-tools must be a space-separated string');
  }

  return failures;
}
