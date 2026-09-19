const AGENT_MCP_SCHEMA = 'https://agent-plugins.org/schemas/1.0.0/mcp.schema.json';

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function validateAgentMcpConfig(config, relativePath = 'mcp.json') {
  const failures = [];
  const addFailure = (message) => failures.push(`${relativePath}: ${message}`);

  if (!isObject(config)) {
    addFailure('configuration must be a JSON object');
  } else {
    if (config.$schema !== AGENT_MCP_SCHEMA) {
      addFailure('$schema must identify Agent Plugins MCP 1.0.0');
    }
    if (!isObject(config.mcpServers)) {
      addFailure('mcpServers must be an object');
    }
    for (const field of Object.keys(config)) {
      if (!['$schema', 'mcpServers'].includes(field)) {
        addFailure(`unsupported top-level field "${field}"`);
      }
    }
  }

  if (isObject(config) && (!isObject(config.mcpServers) || Object.keys(config.mcpServers).length !== 0)) {
    addFailure('keep mcpServers empty; users must explicitly select their tenant endpoint');
  }

  return failures;
}
