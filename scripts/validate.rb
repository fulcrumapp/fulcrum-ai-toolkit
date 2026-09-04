#!/usr/bin/env ruby
# frozen_string_literal: true

require "json"
require "pathname"
require "uri"
require "yaml"
require_relative "content_contracts"
require_relative "file_contracts"
require_relative "manifest_contracts"

ROOT = File.expand_path("..", __dir__)
ROOT_PATH = Pathname.new(ROOT)
PLUGIN_RELATIVE_PATH = File.join("plugins", "fulcrum-ai-toolkit")
PLUGIN_DIR = File.join(ROOT, PLUGIN_RELATIVE_PATH)
SKILLS_DIR = File.join(PLUGIN_DIR, "skills")
EXPECTED_SKILLS = %w[
  fulcrum-access-management
  fulcrum-app-builder
  fulcrum-app-design
  fulcrum-app-extensions
  fulcrum-app-goal
  fulcrum-data-events
  fulcrum-data-migration
  fulcrum-discovery
  fulcrum-gis-mapping
  fulcrum-integration-patterns
  fulcrum-product-knowledge
  fulcrum-query-api
  fulcrum-report-building
  fulcrum-safety
  fulcrum-solution-document
  fulcrum-workflow-decomposition
].freeze
COVERAGE_MAP_RELATIVE_PATH = File.join(
  PLUGIN_RELATIVE_PATH,
  "docs",
  "legacy-product-knowledge-coverage.md"
)
EXAMPLE_COVERAGE_RELATIVE_PATH = File.join(
  PLUGIN_RELATIVE_PATH,
  "docs",
  "legacy-example-coverage.md"
)
FINGERPRINT_ALLOWED_PATHS = [
  COVERAGE_MAP_RELATIVE_PATH,
  EXAMPLE_COVERAGE_RELATIVE_PATH
].freeze
REQUIRED_COVERAGE_DOMAINS = [
  "Platform overview",
  "Plans and licensing",
  "Field types",
  "App architecture",
  "Data Events",
  "Workflows",
  "Reporting",
  "App Extensions",
  "MCP tools and build flow",
  "Integrations",
  "GIS and mapping",
  "Query API",
  "Users, roles, SSO, and SCIM",
  "Data migration",
  "AI",
  "Sidecars and internal tools",
  "Common misconceptions",
  "Source index"
].freeze

failures = []
json_documents = {}

def repo_relative_path(path)
  Pathname.new(path).relative_path_from(ROOT_PATH).to_s
end

def references_section_has_url?(text)
  section = text.match(/^## References[ \t]*$\n?(.*?)(?=^## [^\n]*$|\z)/m)
  section && section[1].match?(/\]\(https?:\/\/[^)]+\)/)
end

skill_paths = Dir[File.join(SKILLS_DIR, "*", "SKILL.md")].sort
actual_skill_names = skill_paths.map { |path| File.basename(File.dirname(path)) }.sort
if actual_skill_names != EXPECTED_SKILLS
  missing = EXPECTED_SKILLS - actual_skill_names
  unexpected = actual_skill_names - EXPECTED_SKILLS
  failures << "skill inventory mismatch (missing: #{missing.join(", ")}; unexpected: #{unexpected.join(", ")})"
end

skill_paths.each do |path|
  relative_path = repo_relative_path(path)
  directory_name = File.basename(File.dirname(path))
  text = File.read(path)
  parts = text.split(/^---\s*$/, 3)

  if parts.length != 3
    failures << "#{relative_path}: missing YAML frontmatter"
    next
  end

  begin
    frontmatter = YAML.safe_load(parts[1], permitted_classes: [], aliases: false)
  rescue Psych::Exception => e
    failures << "#{relative_path}: invalid YAML frontmatter (#{e.message.lines.first.strip})"
    next
  end

  unless frontmatter.is_a?(Hash) && frontmatter["name"] && frontmatter["description"]
    failures << "#{relative_path}: frontmatter needs name and description"
  end

  if frontmatter.is_a?(Hash) && frontmatter["name"] != directory_name
    failures << "#{relative_path}: frontmatter name does not match directory"
  end

  if text.include?("/mnt/skills/organization")
    failures << "#{relative_path}: contains a corporate absolute skill path"
  end

  if text.include?("github.com/fulcrumapp/app-mcp")
    failures << "#{relative_path}: contains a private App MCP repository URL"
  end

  if text.match?(/(?:api[_-]?token|secret|password| bearer )[=:][[:space:]]*[A-Za-z0-9_\-]{12,}/i)
    failures << "#{relative_path}: possible credential in skill content"
  end

  unless references_section_has_url?(text)
    failures << "#{relative_path}: add a References section with at least one URL"
  end
end

json_paths = Dir[
  File.join(ROOT, "*.json"),
  File.join(ROOT, ".*-plugin", "*.json"),
  File.join(ROOT, ".github", "plugin", "*.json"),
  File.join(ROOT, ".agents", "plugins", "*.json"),
  File.join(PLUGIN_DIR, "*.json"),
  File.join(PLUGIN_DIR, ".*-plugin", "*.json")
].sort
json_paths.each do |path|
  begin
    json_documents[repo_relative_path(path)] = JSON.parse(File.read(path))
  rescue JSON::ParserError => e
    failures << "#{repo_relative_path(path)}: invalid JSON (#{e.message})"
  end
end

public_text_paths = [
  File.join(ROOT, "README.md"),
  File.join(ROOT, "marketplace.json"),
  File.join(ROOT, ".claude-plugin", "marketplace.json"),
  File.join(ROOT, ".github", "plugin", "marketplace.json"),
  File.join(ROOT, ".agents", "plugins", "marketplace.json")
] + FileContracts.files_under(PLUGIN_DIR)
private_reference_pattern = %r{
  atlassian\.net|
  slack\.com|
  github\.com/fulcrumapp/app-mcp
}ix
public_text_paths.uniq.select { |path| File.file?(path) }.each do |path|
  text = FileContracts.read_text(path)
  if text.match?(private_reference_pattern) || ContentContracts.private_filesystem_path?(text)
    failures << "#{repo_relative_path(path)}: contains a private path or collaboration URL"
  end

  if ContentContracts.private_provenance?(text)
    failures << "#{repo_relative_path(path)}: contains private person or customer provenance"
  end

  ContentContracts.invalid_source_attributions(text).each do
    failures << "#{repo_relative_path(path)}: Source attribution must include a public URL on the same line"
  end

  ContentContracts.invalid_inventory_fingerprints(
    text,
    relative_path: repo_relative_path(path),
    allowed_path: FINGERPRINT_ALLOWED_PATHS
  ).each do
    failures << "#{repo_relative_path(path)}: Inventory fingerprint is allowed only in #{FINGERPRINT_ALLOWED_PATHS.join(" or ")}"
  end
end

agent_plugin_manifest_path = "#{PLUGIN_RELATIVE_PATH}/plugin.json"
agent_plugin_manifest = json_documents[agent_plugin_manifest_path]
if agent_plugin_manifest
  ManifestContracts.validate_agent_plugin(agent_plugin_manifest).each do |error|
    failures << "#{agent_plugin_manifest_path}: #{error}"
  end
end

cursor_manifest_path = "#{PLUGIN_RELATIVE_PATH}/.cursor-plugin/plugin.json"
cursor_manifest = json_documents[cursor_manifest_path]
if cursor_manifest
  ManifestContracts.validate_cursor(cursor_manifest).each do |error|
    failures << "#{cursor_manifest_path}: #{error}"
  end
end

claude_manifest_path = "#{PLUGIN_RELATIVE_PATH}/.claude-plugin/plugin.json"
if (claude_manifest = json_documents[claude_manifest_path])
  ManifestContracts.validate_claude(claude_manifest).each do |error|
    failures << "#{claude_manifest_path}: #{error}"
  end
end

codex_manifest_path = "#{PLUGIN_RELATIVE_PATH}/.codex-plugin/plugin.json"
if (codex_manifest = json_documents[codex_manifest_path])
  ManifestContracts.validate_codex(codex_manifest).each do |error|
    failures << "#{codex_manifest_path}: #{error}"
  end
end

unless cursor_manifest&.dig("skills") == "./skills/"
  failures << "#{cursor_manifest_path}: skills must point to ./skills/"
end

hermes_manifest = File.join(PLUGIN_DIR, ".hermes-plugin", "plugin.yaml")
if File.file?(hermes_manifest)
  begin
    hermes_config = YAML.safe_load(File.read(hermes_manifest), permitted_classes: [], aliases: false)
  rescue Psych::Exception => e
    failures << "#{PLUGIN_RELATIVE_PATH}/.hermes-plugin/plugin.yaml: invalid YAML (#{e.message.lines.first.strip})"
  else
    unless hermes_config.is_a?(Hash) && hermes_config["skills_dir"] == "skills"
      failures << "#{PLUGIN_RELATIVE_PATH}/.hermes-plugin/plugin.yaml: skills_dir must point to skills"
    end
  end
else
  failures << "#{PLUGIN_RELATIVE_PATH}/.hermes-plugin/plugin.yaml: manifest is missing"
end

marketplace_sources = {
  ".github/plugin/marketplace.json" => "./plugins/fulcrum-ai-toolkit",
  ".claude-plugin/marketplace.json" => "./plugins/fulcrum-ai-toolkit",
  "marketplace.json" => "./plugins/fulcrum-ai-toolkit"
}
marketplace_sources.each do |relative_path, expected_source|
  actual_source = json_documents.dig(relative_path, "plugins", 0, "source")
  unless actual_source == expected_source
    failures << "#{relative_path}: plugin source must point to #{expected_source}"
  end
end

codex_marketplace_source = json_documents.dig(".agents/plugins/marketplace.json", "plugins", 0, "source")
unless codex_marketplace_source == {
  "source" => "local",
  "path" => "./plugins/fulcrum-ai-toolkit"
}
  failures << ".agents/plugins/marketplace.json: plugin source must point to the local package"
end

unless File.directory?(PLUGIN_DIR) && File.directory?(SKILLS_DIR)
  failures << "#{PLUGIN_RELATIVE_PATH}: distributable plugin package is missing"
end

repo_local_skills = File.join(ROOT, ".agents", "skills")
if File.directory?(repo_local_skills)
  failures << ".agents/skills must remain reserved for repository-scoped skills"
end

readme = File.join(ROOT, "README.md")
readme_text = File.read(readme)
readme_skill_names = readme_text.scan(/^\| `([^`]+)` \|/).flatten.sort
if readme_skill_names != actual_skill_names
  failures << "README skill inventory does not match #{PLUGIN_RELATIVE_PATH}/skills/*/SKILL.md"
end

unless references_section_has_url?(readme_text)
  failures << "README.md: add a References section with at least one URL"
end

coverage_map = File.join(ROOT, COVERAGE_MAP_RELATIVE_PATH)
if File.file?(coverage_map)
  coverage_text = File.read(coverage_map)
  REQUIRED_COVERAGE_DOMAINS.each do |domain|
    unless coverage_text.match?(/^\|\s+\*\*#{Regexp.escape(domain)}\*\*/)
      failures << "#{COVERAGE_MAP_RELATIVE_PATH}: missing coverage row for #{domain}"
    end
  end

  unless coverage_text.include?("## Source hierarchy")
    failures << "#{COVERAGE_MAP_RELATIVE_PATH}: missing source hierarchy"
  end

  unless coverage_text.include?("## Review and retirement")
    failures << "#{COVERAGE_MAP_RELATIVE_PATH}: missing review and retirement criteria"
  end

  unless coverage_text.match?(/SHA-256:\s*(?:>\s*)?`[0-9a-f]{64}`/i)
    failures << "#{COVERAGE_MAP_RELATIVE_PATH}: missing legacy artifact SHA-256"
  end

  local_path_pattern = %r{
    (?:^|[[:space:]`"'(])
    (?:
      file:// |
      /(?:Users|home|mnt|Volumes)(?:/|\b) |
      [A-Z]:\\Users(?:\\|\b)
    )
  }ix
  private_collaboration_hosts = ["atlassian.net", "slack.com"].freeze
  private_collaboration_host = nil
  URI.extract(coverage_text, %w[http https]).each do |url|
    begin
      host = URI.parse(url).host&.downcase
    rescue URI::InvalidURIError
      failures << "#{COVERAGE_MAP_RELATIVE_PATH}: invalid public URL #{url.inspect}"
      next
    end

    private_collaboration_host ||= private_collaboration_hosts.find do |private_host|
      host == private_host || host&.end_with?(".#{private_host}")
    end
  end

  if coverage_text.match?(local_path_pattern)
    failures << "#{COVERAGE_MAP_RELATIVE_PATH}: contains a local filesystem path"
  end
  if private_collaboration_host
    failures << "#{COVERAGE_MAP_RELATIVE_PATH}: contains a private collaboration URL for #{private_collaboration_host}"
  end
else
  failures << "#{COVERAGE_MAP_RELATIVE_PATH}: coverage manifest is missing"
end

example_coverage = File.join(ROOT, EXAMPLE_COVERAGE_RELATIVE_PATH)
if File.file?(example_coverage)
  example_coverage_text = File.read(example_coverage)

  unless example_coverage_text.match?(/SHA-256:\s*\n?>?\s*`[0-9a-f]{64}`/)
    failures << "#{EXAMPLE_COVERAGE_RELATIVE_PATH}: missing legacy artifact SHA-256"
  end

  unless example_coverage_text.include?("## Source rules for executable files")
    failures << "#{EXAMPLE_COVERAGE_RELATIVE_PATH}: missing executable source rules"
  end

  if example_coverage_text.match?(%r{/(?:Users|home)/|atlassian\.net|slack\.com}i)
    failures << "#{EXAMPLE_COVERAGE_RELATIVE_PATH}: contains a local path or private collaboration URL"
  end
else
  failures << "#{EXAMPLE_COVERAGE_RELATIVE_PATH}: example coverage manifest is missing"
end

if failures.empty?
  puts "Validation passed: #{skill_paths.length} skills and #{json_paths.length} JSON manifests"
  exit 0
end

warn "Validation failed:"
failures.each { |failure| warn "- #{failure}" }
exit 1
