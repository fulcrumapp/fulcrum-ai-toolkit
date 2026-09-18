import assert from 'node:assert/strict';
import test from 'node:test';
import { validateAgentMcpConfig } from '../scripts/agent-mcp-config.mjs';

const validConfig = {
  $schema: 'https://agent-plugins.org/schemas/1.0.0/mcp.schema.json',
  mcpServers: {}
};

function errors(config = validConfig) {
  return validateAgentMcpConfig(config, 'plugins/example/mcp.json');
}

test('accepts an empty conformant Agent Plugins MCP configuration', () => {
  assert.deepEqual(errors(), []);
});

test('rejects a non-object MCP configuration', () => {
  const failures = errors(null);

  assert.ok(failures.some((failure) => failure.includes('configuration must be a JSON object')));
  assert.ok(failures.some((failure) => failure.includes('keep mcpServers empty')));
});

test('rejects missing schema and unknown top-level fields', () => {
  const withoutSchema = { ...validConfig };
  delete withoutSchema.$schema;
  const failures = errors({ ...withoutSchema, unsupported: true });

  assert.ok(failures.some((failure) => failure.includes('$schema must identify Agent Plugins MCP 1.0.0')));
  assert.ok(failures.some((failure) => failure.includes('unsupported top-level field "unsupported"')));
});

test('rejects malformed MCP configuration values', () => {
  const failures = errors({
    $schema: 'https://agent-plugins.org/schemas/1.0.0/mcp.schema.json',
    mcpServers: []
  });

  assert.ok(failures.some((failure) => failure.includes('mcpServers must be an object')));
  assert.ok(failures.some((failure) => failure.includes('keep mcpServers empty')));
});

test('rejects configured MCP servers in the portable package', () => {
  const failures = errors({
    ...validConfig,
    mcpServers: { fulcrum: { command: 'npx' } }
  });

  assert.deepEqual(failures, [
    'plugins/example/mcp.json: keep mcpServers empty; users must explicitly select their tenant endpoint'
  ]);
});
