#!/usr/bin/env ruby
# frozen_string_literal: true

require "json"
require "yaml"
require_relative "../scripts/manifest_contracts"

ROOT = File.expand_path("..", __dir__)
PLUGIN = File.join(ROOT, "plugins", "fulcrum-ai-toolkit")

def assert(condition, message)
  return if condition

  warn "Manifest contract test failed: #{message}"
  exit 1
end

def json(relative_path)
  JSON.parse(File.read(File.join(PLUGIN, relative_path)))
end

def author_object_valid?(author)
  author.is_a?(Hash) && author["name"].is_a?(String)
end

# Source: https://agent-plugins.org/specification#52-manifest-object
agent_plugin = json("plugin.json")
assert(ManifestContracts.validate_agent_plugin(agent_plugin).empty?, "root Agent Plugins manifest is invalid")
assert(author_object_valid?(agent_plugin["author"]), "root Agent Plugins author is not an object with a name")
assert(!agent_plugin.key?("skills"), "root Agent Plugins manifest overrides fixed skills discovery")
assert(
  !ManifestContracts.validate_agent_plugin(agent_plugin.merge("skills" => "./skills/")).empty?,
  "root schema fixture fails to reject an unsupported skills field"
)
assert(
  !ManifestContracts.validate_agent_plugin(agent_plugin.reject { |key| key == "name" }).empty?,
  "root schema fixture fails to reject a missing name"
)
assert(
  !ManifestContracts.validate_agent_plugin(agent_plugin.merge("name" => "Invalid Name")).empty?,
  "root schema fixture fails to reject an invalid name"
)

# Source: https://github.com/cursor/plugins/blob/main/schemas/plugin.schema.json
cursor = json(".cursor-plugin/plugin.json")
assert(ManifestContracts.validate_cursor(cursor).empty?, "Cursor manifest is invalid")
assert(author_object_valid?(cursor["author"]), "Cursor author is not an object with a name")
assert(cursor["skills"] == "./skills/", "Cursor manifest does not reference the shared skills directory")
assert(
  !ManifestContracts.validate_cursor(cursor.merge("interface" => {})).empty?,
  "Cursor schema fixture fails to reject the unsupported interface field"
)
assert(
  !ManifestContracts.validate_cursor(cursor.merge("author" => "Example Publisher")).empty?,
  "Cursor schema fixture fails to reject a string author"
)
assert(
  !ManifestContracts.validate_cursor(cursor.reject { |key| key == "name" }).empty?,
  "Cursor schema fixture fails to reject a missing name"
)
assert(
  ManifestContracts.validate_cursor(cursor.merge("version" => "1.2.3+build.1")).empty?,
  "Cursor schema rejects a valid arbitrary string version"
)
assert(
  !ManifestContracts.validate_cursor(cursor.merge("version" => 1)).empty?,
  "Cursor schema fixture fails to reject a non-string version"
)
assert(
  !ManifestContracts.validate_cursor(cursor.merge("author" => { "name" => "" })).empty?,
  "Cursor schema fixture fails to reject an empty author name"
)
assert(
  !ManifestContracts.validate_cursor(cursor.merge("author" => { "name" => "Example", "url" => "https://example.com" })).empty?,
  "Cursor schema fixture fails to reject an unsupported author URL"
)
assert(
  !ManifestContracts.validate_cursor(cursor.merge("author" => { "name" => "Example", "email" => "not-an-email" })).empty?,
  "Cursor schema fixture fails to reject an invalid author email"
)
assert(
  !ManifestContracts.validate_cursor(cursor.merge("author" => { "name" => "Example", "email" => ".lead@example.com" })).empty?,
  "Cursor schema fixture fails to reject an email with a leading dot"
)
assert(
  !ManifestContracts.validate_cursor(cursor.merge("author" => { "name" => "Example", "email" => "double..dot@example.com" })).empty?,
  "Cursor schema fixture fails to reject an email with consecutive dots"
)

# Source: https://json.schemastore.org/claude-code-plugin-manifest.json
claude = json(".claude-plugin/plugin.json")
assert(ManifestContracts.validate_claude(claude).empty?, "Claude manifest is invalid")
assert(claude["skills"] == "./skills/", "Claude manifest does not reference the shared skills directory")
assert(
  ManifestContracts.validate_claude(claude.merge("$schema" => "https://schemas.example.com/ignored.json")).empty?,
  "Claude validator pins the ignored $schema string"
)
[
  claude.merge("$schema" => 1),
  claude.merge("version" => 1),
  claude.merge("unknownField" => true),
  claude.merge("author" => "Example Publisher"),
  claude.merge("skills" => 1),
  claude.merge("skills" => "./wrong/"),
  claude.merge("skills" => []),
  claude.reject { |key| key == "name" }
].each do |fixture|
  assert(!ManifestContracts.validate_claude(fixture).empty?, "Claude validator accepts an invalid mutation")
end

# Source: https://developers.openai.com/plugins/build/plugins#manifest-fields
codex = json(".codex-plugin/plugin.json")
assert(ManifestContracts.validate_codex(codex).empty?, "Codex manifest is invalid")
assert(codex["skills"] == "./skills/", "Codex manifest does not reference the shared skills directory")
[
  codex.merge("version" => 1),
  codex.merge("unknownField" => true),
  codex.merge("author" => "Example Publisher"),
  codex.merge("skills" => 1),
  codex.merge("skills" => "skills/"),
  codex.merge("skills" => "./wrong/"),
  codex.merge("skills" => []),
  codex.reject { |key| key == "name" }
].each do |fixture|
  assert(!ManifestContracts.validate_codex(fixture).empty?, "Codex validator accepts an invalid mutation")
end

# Source: https://github.com/NousResearch/hermes-agent
hermes_path = File.join(PLUGIN, ".hermes-plugin", "plugin.yaml")
hermes = YAML.safe_load(File.read(hermes_path), permitted_classes: [], aliases: false)
assert(hermes["skills_dir"] == "skills", "Hermes manifest does not reference the shared skills directory")

puts "Manifest contract test passed: Agent Plugins, Cursor, Claude, Codex, and Hermes manifests"
