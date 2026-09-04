#!/usr/bin/env ruby
# frozen_string_literal: true

require_relative "../scripts/content_contracts"
require_relative "../scripts/file_contracts"
require "fileutils"
require "tmpdir"

ROOT = File.expand_path("..", __dir__)
SKILLS = File.join(ROOT, "plugins", "fulcrum-ai-toolkit", "skills")

FOCUSED_SKILLS = {
  "fulcrum-integration-patterns" => "resources/integration-selection-reference.md",
  "fulcrum-gis-mapping" => "resources/mapping-capability-reference.md",
  "fulcrum-query-api" => "resources/query-modeling-reference.md",
  "fulcrum-access-management" => "resources/access-control-reference.md",
  "fulcrum-data-migration" => "resources/migration-assessment-reference.md"
}.freeze

def assert(condition, message)
  return if condition

  warn "Product knowledge decomposition test failed: #{message}"
  exit 1
end

def read(relative_path)
  File.read(File.join(ROOT, relative_path))
end

router = read("plugins/fulcrum-ai-toolkit/skills/fulcrum-product-knowledge/SKILL.md")
coverage = read("plugins/fulcrum-ai-toolkit/docs/legacy-product-knowledge-coverage.md")
readme = read("README.md")
source_index = read("plugins/fulcrum-ai-toolkit/skills/fulcrum-product-knowledge/resources/llms-txt-index.md")

FOCUSED_SKILLS.each do |name, resource|
  skill_path = File.join(SKILLS, name, "SKILL.md")
  resource_path = File.join(SKILLS, name, resource)
  assert(File.file?(skill_path), "#{name} is not packaged")
  assert(File.file?(resource_path), "#{name} resource is missing")

  skill = File.read(skill_path)
  [
    "## When To Use",
    "## When Not To Use",
    "## Source Order",
    "## Workflow",
    "## App MCP",
    "## Confirmation, Privacy, And Failure",
    "## References"
  ].each do |heading|
    assert(skill.include?(heading), "#{name} lacks #{heading}")
  end

  assert(skill.match?(/^description: .*Use /), "#{name} frontmatter lacks model invocation triggers")
  assert(skill.match?(/^> Source: .*https:\/\//), "#{name} lacks a nearby public Source note")
  assert(skill.include?(resource), "#{name} does not link its focused resource")
  assert(router.include?("../#{name}/SKILL.md"), "router does not link #{name}")
  assert(coverage.include?("../skills/#{name}/SKILL.md"), "coverage map does not link #{name}")
  assert(readme.include?("| `#{name}` |"), "README does not inventory #{name}")

  skill_tree_files = FileContracts.files_under(File.join(SKILLS, name))
  marker_files = skill_tree_files.select do |path|
    ContentContracts.fence_marker_token?(FileContracts.read_text(path))
  end
  assert(marker_files.empty?, "#{name} contains prohibited fence marker tokens: #{marker_files.join(", ")}")
end

[
  "```",
  "~~~",
  "literal ``` demonstration",
  "hidden ~~~ marker"
].each do |fixture|
  assert(ContentContracts.fence_marker_token?(fixture), "fence-token policy missed a neutral fixture")
end
assert(
  !ContentContracts.fence_marker_token?("double markers `` and ~~ are allowed"),
  "fence-token policy rejects text without a triple marker"
)

Dir.mktmpdir("toolkit-hidden-fences") do |directory|
  hidden_file = File.join(directory, ".private.md")
  hidden_text_file = File.join(directory, ".private.txt")
  hidden_directory_file = File.join(directory, ".private", "notes")
  FileUtils.mkdir_p(File.dirname(hidden_directory_file))
  File.write(hidden_file, "```text\nhidden\n```\n")
  File.write(hidden_text_file, "> ```text\n> hidden\n> ```\n")
  File.write(hidden_directory_file, "~~~text\nhidden\n~~~\n")
  discovered = FileContracts.files_under(directory)
  assert(discovered.include?(hidden_file), "fence traversal omits a hidden file")
  assert(discovered.include?(hidden_text_file), "fence traversal omits a hidden text extension")
  assert(discovered.include?(hidden_directory_file), "fence traversal omits a hidden directory")
  assert(
    discovered.all? { |path| ContentContracts.fence_marker_token?(FileContracts.read_text(path)) },
    "fence traversal misses hidden fixture content"
  )
end

%w[fulcrum-workflows fulcrum-ai-capabilities].each do |excluded|
  assert(!File.directory?(File.join(SKILLS, excluded)), "excluded skill #{excluded} was created")
end

[
  "future extraction",
  "Planned `fulcrum-integration-patterns`",
  "Planned `fulcrum-gis-mapping`",
  "Planned `fulcrum-query-api`",
  "Planned `fulcrum-access-management`",
  "Planned `fulcrum-data-migration`",
  "interim summary",
  "interim guidance"
].each do |stale_text|
  assert(!coverage.include?(stale_text), "coverage map retains stale text #{stale_text.inspect}")
end

assert(router.include?("field-choice-optimizer"), "router drops the shared field-choice optimizer handoff")
assert(router.include?("feasibility-check"), "router drops the shared feasibility handoff")
assert(source_index.include?("Every URL below was present in the upstream `llms.txt`"), "source index does not define upstream provenance")
forbidden_source_hosts = %w[
  help.fulcrumapp.com
  www.fulcrumapp.com
  raw.githubusercontent.com
]
assert(
  URI.extract(source_index, %w[http https]).none? do |url|
    forbidden_source_hosts.include?(URI.parse(url).host&.downcase)
  end,
  "source index mixes curated supplements with llms.txt entries"
)

puts "Product knowledge decomposition test passed: five focused skills are sourced, routed, and packaged"
