const AGENT_SKILL_FIELDS = new Set([
  'name',
  'description',
  'license',
  'compatibility',
  'metadata',
  'allowed-tools'
]);

const MAX_SKILL_NAME_LENGTH = 64;
const MAX_DESCRIPTION_LENGTH = 1024;
const MAX_COMPATIBILITY_LENGTH = 500;

function characterLength(value) {
  return Array.from(value).length;
}

function normalizeSkillName(value) {
  return value.normalize('NFKC').trim();
}

function isSkillNameCharacter(value) {
  return /^[\p{Letter}\p{Number}-]$/u.test(value);
}

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

  if (typeof frontmatter.name !== 'string' || normalizeSkillName(frontmatter.name).length === 0) {
    addFailure('frontmatter name must be a non-empty string');
  } else {
    const normalizedName = normalizeSkillName(frontmatter.name);
    const nameCharacters = Array.from(normalizedName);
    if (
      characterLength(normalizedName) > MAX_SKILL_NAME_LENGTH ||
      normalizedName !== normalizedName.toLowerCase() ||
      normalizedName.startsWith('-') ||
      normalizedName.endsWith('-') ||
      normalizedName.includes('--') ||
      !nameCharacters.every(isSkillNameCharacter)
    ) {
      addFailure(
        'frontmatter name must be 1-64 characters using lowercase letters, numbers, and hyphens, without leading, trailing, or consecutive hyphens'
      );
    }
    if (normalizedName !== directoryName.normalize('NFKC')) {
      addFailure('frontmatter name does not match directory');
    }
  }

  if (
    typeof frontmatter.description !== 'string' ||
    frontmatter.description.trim().length === 0
  ) {
    addFailure('frontmatter description must be a non-empty string');
  } else if (characterLength(frontmatter.description) > MAX_DESCRIPTION_LENGTH) {
    addFailure(`frontmatter description must be at most ${MAX_DESCRIPTION_LENGTH} characters`);
  }

  if (hasOwn(frontmatter, 'license') && typeof frontmatter.license !== 'string') {
    addFailure('frontmatter license must be a string');
  }

  if (hasOwn(frontmatter, 'compatibility')) {
    if (typeof frontmatter.compatibility !== 'string' || frontmatter.compatibility.trim().length === 0) {
      addFailure('frontmatter compatibility must be a non-empty string');
    } else if (characterLength(frontmatter.compatibility) > MAX_COMPATIBILITY_LENGTH) {
      addFailure(`frontmatter compatibility must be at most ${MAX_COMPATIBILITY_LENGTH} characters`);
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
