#!/usr/bin/env ruby
# frozen_string_literal: true

ROOT = File.expand_path("..", __dir__)
SKILLS = File.join(ROOT, "plugins", "fulcrum-ai-toolkit", "skills")

def read_skill(name, relative_path = "SKILL.md")
  File.read(File.join(SKILLS, name, relative_path))
end

def assert(condition, message)
  return if condition

  warn "App MCP contract test failed: #{message}"
  exit 1
end

def assert_in_order(text, tokens, message)
  cursor = 0
  tokens.each do |token|
    position = text.index(token, cursor)
    assert(position, "#{message}: missing or out-of-order #{token.inspect}")
    cursor = position + token.length
  end
end

app_builder = read_skill("fulcrum-app-builder")
product_knowledge = read_skill("fulcrum-product-knowledge")
data_events = read_skill("fulcrum-data-events")
data_events_runtime = read_skill("fulcrum-data-events", "resources/data-events-runtime-api.md")
app_extensions = read_skill("fulcrum-app-extensions")
extension_bridge = read_skill("fulcrum-app-extensions", "resources/extension-bridge-api.md")
report_building = read_skill("fulcrum-report-building")
report_reference = read_skill("fulcrum-report-building", "resources/report-template-reference.md")

supported_surfaces = %w[
  fulcrum_forms_*
  fulcrum_schema_*
  fulcrum_forms_validate
  fulcrum_choice_lists_*
  fulcrum_classification_sets_*
  fulcrum_projects_*
  fulcrum_webhooks_*
  fulcrum_reference_files_*
  fulcrum_layers_list
  fulcrum_layers_get
  fulcrum_memberships_list
  fulcrum_roles_list
  fulcrum_report_templates_*
  fulcrum_reports_create
  fulcrum_expressions_*
  fulcrum_extensions_*
]
supported_surfaces.each do |tool|
  assert(app_builder.include?(tool), "app builder omits supported App MCP surface #{tool}")
end

%w[Query\ API record\ CRUD media\ CRUD].each do |boundary|
  assert(app_builder.include?(boundary), "app builder omits unsupported boundary #{boundary}")
end

update_workflow = app_builder
  .split("For an existing app:", 2)
  .last
  .split("### Data Event scripts", 2)
  .first
assert_in_order(
  update_workflow,
  [
    "fulcrum_forms_get",
    "preserve every existing element key and inline-choice key",
    "fulcrum_schema_build_field",
    "fulcrum_forms_validate",
    "fulcrum_forms_update"
  ],
  "existing-form workflow"
)
assert(
  update_workflow.include?("Never rebuild an existing schema wholesale with `fulcrum_schema_build_form`"),
  "existing-form workflow allows wholesale schema regeneration"
)
assert(
  app_builder.include?('{ "label": "...", "value": "..." }') &&
    app_builder.include?("preserves explicit values"),
  "app builder does not document mixed choice inputs and explicit-value preservation"
)
assert(
  app_builder.include?("skip_default_report: true") &&
    app_builder.include?("report_template_error") &&
    app_builder.include?("non-fatal"),
  "app builder does not document default Report Template behavior"
)

[app_builder, data_events].each do |document|
  assert(document.include?("There are no standalone Data Event CRUD tools"), "Data Event CRUD boundary is missing")
  assert_in_order(
    document,
    ["fulcrum_forms_get", "script", "fulcrum_forms_update"],
    "form-script persistence workflow"
  )
end

assert(
  data_events.match?(
    /LOADFILE\(\{\s*name: 'shared-helpers\.js',\s*form_id: FORM\(\)\.id,\s*variable: 'sharedHelpers'\s*\}, function\(error, data\)/m
  ),
  "LOADFILE object and callback signature is missing"
)
assert(!data_events.match?(/LOADFILE\(\s*['"]/), "positional LOADFILE guidance remains")
assert(
  data_events.include?("fulcrum_expressions_data_events_reference"),
  "Data Event guidance does not defer to the registered knowledge tool"
)

assert_in_order(
  app_extensions,
  %w[
    fulcrum_extensions_list_patterns
    fulcrum_extensions_explain
    fulcrum_extensions_generate
  ],
  "extension knowledge workflow"
)
assert(
  app_extensions.match?(/OPENEXTENSION\(\{.*url:.*title:.*data:.*onMessage:/m),
  "object-form OPENEXTENSION contract is missing"
)
assert(
  app_extensions.include?("attachment://species_picker.html") &&
    app_extensions.include?("initialize(payload.data || {})"),
  "generated extension target or payload semantics are missing"
)
assert(
  extension_bridge.include?("fulcrum_reference_files_upload({ form_id, file_name, content })"),
  "Reference File upload arguments do not match App MCP"
)
assert(
  extension_bridge.include?("fulcrum_forms_get") &&
    extension_bridge.include?("fulcrum_forms_update"),
  "extension workflow does not preserve the existing form script"
)

%w[
  fulcrum_report_templates_list
  fulcrum_report_templates_get
  fulcrum_report_templates_create
  fulcrum_report_templates_update
  fulcrum_report_templates_delete
  fulcrum_reports_create
].each do |tool|
  assert(report_building.include?(tool), "report workflow omits #{tool}")
end
assert(
  report_building.include?("API(path, options)") &&
    report_building.include?("API('/choice_lists'"),
  "report workflow does not use the documented API runtime"
)

contract_documents = [
  app_builder,
  product_knowledge,
  data_events,
  data_events_runtime,
  app_extensions,
  extension_bridge,
  report_building,
  report_reference
]
combined_contract = contract_documents.join("\n")
assert(!combined_contract.include?("APIREQUEST"), "invented report runtime remains")
assert(!combined_contract.include?("file_content"), "obsolete Reference File content argument remains")
assert(!combined_contract.include?("filename="), "obsolete Reference File filename argument remains")
assert(
  !combined_contract.include?("https://fulcrumapp.com/js/fulcrum-extension.js"),
  "stale hosted extension bootstrap remains"
)

assert(
  product_knowledge.include?("Query API execution, record CRUD, and media CRUD remain outside App MCP"),
  "product router does not preserve App MCP boundaries"
)

contract_documents.each do |document|
  assert(document.match?(/^> Source: .*https:\/\//), "contract documentation lacks a linked Source note")
end

public_files = [File.join(ROOT, "README.md")] +
  Dir[File.join(ROOT, "plugins", "fulcrum-ai-toolkit", "**", "*.{md,json,yaml,yml}")]
public_content = public_files.map { |path| File.read(path) }.join("\n")
assert(
  !public_content.match?(%r{/(?:Users|home)/|atlassian\.net|slack\.com|/mnt/skills/organization}i),
  "public toolkit content contains a private path or collaboration URL"
)

puts "App MCP contract test passed: control-plane boundaries, signatures, and key-preserving updates"
