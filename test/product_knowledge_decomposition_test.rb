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

router = read("plugins/fulcrum-ai-toolkit/skills/fulcrum-product-knowledge/SKILL.md")
coverage = read("plugins/fulcrum-ai-toolkit/docs/legacy-product-knowledge-coverage.md")
readme = read("README.md")

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

  combined = [skill, File.read(resource_path)].join("\n")
  assert(!combined.match?(/^```(?:js|javascript|html|css|sql|ejs)\b/), "#{name} contains layer-4 executable examples")
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

puts "Product knowledge decomposition test passed: five focused skills are sourced, routed, and packaged"
