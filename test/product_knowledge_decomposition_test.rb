#!/usr/bin/env ruby
# frozen_string_literal: true

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

def fenced_code_block?(text)
  text.each_line.any? do |source_line|
    line = source_line.lstrip
    while line.start_with?(">")
      line = line.sub(/\A>\s?/, "").lstrip
    end
    line.match?(/\A(?:`{3,}|~{3,})/)
  end
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

  skill_tree_files = Dir[File.join(SKILLS, name, "**", "*")].select { |path| File.file?(path) }
  fenced_files = skill_tree_files.select { |path| fenced_code_block?(File.read(path)) }
  assert(fenced_files.empty?, "#{name} contains fenced code blocks: #{fenced_files.join(", ")}")
end

[
  "```\nexample\n```",
  "```typescript\nconst value = 1;\n```",
  "```shell\necho example\n```",
  "   ```ruby\nvalue = 1\n   ```",
  "~~~python\nvalue = 1\n~~~",
  "> ```javascript\n> const value = 1;\n> ```",
  "> ~~~typescript\n> const value = 1;\n> ~~~"
].each do |fixture|
  assert(fenced_code_block?(fixture), "fenced-code detector missed a neutral fixture")
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
assert(!source_index.include?("help.fulcrumapp.com"), "source index mixes curated Help Center supplements with llms.txt entries")
assert(!source_index.include?("www.fulcrumapp.com/pricing"), "source index mixes pricing supplements with llms.txt entries")
assert(!source_index.include?("raw.githubusercontent.com"), "source index mixes OpenAPI supplements with llms.txt entries")

puts "Product knowledge decomposition test passed: five focused skills are sourced, routed, and packaged"
