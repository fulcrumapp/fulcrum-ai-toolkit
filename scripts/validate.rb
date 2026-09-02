#!/usr/bin/env ruby
# frozen_string_literal: true

require "json"
require "yaml"

ROOT = File.expand_path("..", __dir__)
SKILLS_DIR = File.join(ROOT, ".agents", "skills")
EXPECTED_SKILL_COUNT = 11

failures = []
json_documents = {}

skill_paths = Dir[File.join(SKILLS_DIR, "*", "SKILL.md")].sort
if skill_paths.length != EXPECTED_SKILL_COUNT
  failures << "expected #{EXPECTED_SKILL_COUNT} skills, found #{skill_paths.length}"
end

skill_paths.each do |path|
  relative_path = path.delete_prefix("#{ROOT}/")
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

  if text.match?(/(?:api[_-]?token|secret|password| bearer )[=:][[:space:]]*[A-Za-z0-9_\-]{12,}/i)
    failures << "#{relative_path}: possible credential in skill content"
  end

  unless text.match?(/^## References\s*$/) && text.match?(/\]\(https?:\/\/[^)]+\)/)
    failures << "#{relative_path}: add a References section with at least one URL"
  end
end

json_paths = Dir[
  File.join(ROOT, "*.json"),
  File.join(ROOT, ".*-plugin", "*.json"),
  File.join(ROOT, ".agents", "plugins", "*.json")
].sort
json_paths.each do |path|
  begin
    json_documents[path.delete_prefix("#{ROOT}/")] = JSON.parse(File.read(path))
  rescue JSON::ParserError => e
    failures << "#{path.delete_prefix("#{ROOT}/")}: invalid JSON (#{e.message})"
  end
end

expected_skill_adapters = [
  ".claude-plugin/plugin.json",
  ".codex-plugin/plugin.json",
  ".cursor-plugin/plugin.json",
  "plugin.json"
]
expected_skill_adapters.each do |relative_path|
  skills_path = json_documents.dig(relative_path, "skills")
  unless skills_path == "./.agents/skills/"
    failures << "#{relative_path}: skills must point to ./.agents/skills/"
  end
end

hermes_manifest = File.join(ROOT, ".hermes-plugin", "plugin.yaml")
unless File.read(hermes_manifest).match?(/^skills_dir:\s+\.agents\/skills\s*$/)
  failures << ".hermes-plugin/plugin.yaml: skills_dir must point to .agents/skills"
end

readme = File.join(ROOT, "README.md")
readme_text = File.read(readme)
readme_skill_names = readme_text.scan(/^\| `([^`]+)` \|/).flatten.sort
actual_skill_names = skill_paths.map { |path| File.basename(File.dirname(path)) }.sort
if readme_skill_names != actual_skill_names
  failures << "README skill inventory does not match .agents/skills/*/SKILL.md"
end

unless readme_text.match?(/^## References\s*$/) && readme_text.match?(/\]\(https?:\/\/[^)]+\)/)
  failures << "README.md: add a References section with at least one URL"
end

if failures.empty?
  puts "Validation passed: #{skill_paths.length} skills and #{json_paths.length} JSON manifests"
  exit 0
end

warn "Validation failed:"
failures.each { |failure| warn "- #{failure}" }
exit 1
