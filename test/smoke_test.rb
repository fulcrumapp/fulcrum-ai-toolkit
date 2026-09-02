#!/usr/bin/env ruby
# frozen_string_literal: true

require "open3"
require "rbconfig"
ROOT = File.expand_path("..", __dir__)


def assert(condition, message)
  return if condition

  warn "Smoke test failed: #{message}"
  exit 1
end

validator = File.join(ROOT, "scripts", "validate.rb")
stdout, stderr, status = Open3.capture3(RbConfig.ruby, validator, chdir: ROOT)
assert(status.success?, "validation gate failed: #{stderr.empty? ? stdout : stderr}")

skills_dir = File.join(ROOT, "plugins", "fulcrum-ai-toolkit", "skills")
readme = File.read(File.join(ROOT, "README.md"))
app_builder = File.read(File.join(skills_dir, "fulcrum-app-builder", "SKILL.md"))
product_knowledge = File.read(File.join(skills_dir, "fulcrum-product-knowledge", "SKILL.md"))
app_design = File.read(File.join(skills_dir, "fulcrum-app-design", "SKILL.md"))
safety = File.read(File.join(skills_dir, "fulcrum-safety", "SKILL.md"))
data_events = File.read(File.join(skills_dir, "fulcrum-data-events", "SKILL.md"))
app_extensions = File.read(File.join(skills_dir, "fulcrum-app-extensions", "SKILL.md"))
report_building = File.read(File.join(skills_dir, "fulcrum-report-building", "SKILL.md"))

assert(readme.include?("## References"), "README lacks references")
assert(app_builder.include?("https://agentskills.io/specification"), "skills lack standard reference")

scenario = {
  purpose: "inspect a site",
  fields: ["site name", "condition", "photo", "GPS location", "status"],
  connector_available: false
}

assert(scenario[:purpose] == "inspect a site", "smoke scenario was not initialized")
assert(app_builder.include?("Discovery Questions"), "app builder does not define discovery")
assert(app_builder.include?("Propose The Schema"), "app builder does not require schema approval")
assert(app_builder.include?("When no connector is available"), "app builder lacks MCP-independent handoff")
assert(app_builder.include?("Never claim execution"), "app builder lacks execution honesty safeguard")
assert(product_knowledge.include?("Offline behavior"), "product knowledge lacks offline guidance")
assert(product_knowledge.include?("Plan and licensing gates"), "product knowledge lacks plan guidance")
assert(app_design.include?("repeatable") && app_design.include?("Record Link"), "app design lacks architecture guidance")
assert(safety.include?("hazard") || safety.include?("Safety"), "safety skill is not discoverable for field work")
assert(data_events.include?("ON('change', 'field'"), "data events lacks field-change guidance")
assert(data_events.include?("LOADRECORDS({") && data_events.include?("function(error, result)"), "data events lacks callback-based LOADRECORDS guidance")
assert(data_events.include?("var storage = STORAGE()") && data_events.include?("storage.setItem"), "data events lacks object-based storage guidance")
assert(data_events.include?("REQUEST({") && !data_events.include?("fetch("), "data events uses an obsolete HTTP API")
assert(!data_events.match?(/LOADRECORDS\('[^']/), "data events contains positional LOADRECORDS guidance")
assert(!data_events.include?("ON('edit-record', function(event)"), "data events uses edit-record as a field-change handler")
assert(app_extensions.include?("RecordLinkField"), "app extensions lacks record-picker target guidance")
assert(app_extensions.include?("Duplicated calculation logic"), "app extensions lacks calculation duplication guidance")
assert(app_extensions.include?("Unbounded bridge payloads"), "app extensions lacks payload sizing guidance")
assert(app_extensions.include?("var select = document.getElementById('my-select');") && !app_extensions.include?("Fulcrum.finish({ value: select.value });\n    });"), "app extension example has an out-of-scope select reference")
assert(report_building.include?("Verifying Rendered Output") && report_building.include?("page.get_drawings()"), "report building lacks geometry verification guidance")
assert(report_building.include?("rendering workflow below is a toolkit convention"), "report building lacks provenance for rendering guidance")

field_terms = {
  "site name" => ["site name"],
  "condition" => ["condition"],
  "photo" => ["photo"],
  "GPS location" => ["gps", "latitude", "longitude", "location"],
  "status" => ["status"]
}

scenario[:fields].each do |field|
  terms = field_terms.fetch(field)
  assert(
    terms.any? { |term| app_builder.downcase.include?(term) || product_knowledge.downcase.include?(term) },
    "scenario field is not represented by the toolkit: #{field}"
  )
end

unless scenario[:connector_available]
  assert(app_builder.include?("approved schema") || app_builder.include?("approved implementation handoff"), "no-connector path does not produce a handoff")
end

puts "Smoke test passed: site-inspection discovery, schema approval, offline review, and MCP handoff path"
