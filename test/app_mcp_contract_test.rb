#!/usr/bin/env ruby
# frozen_string_literal: true

ROOT = File.expand_path("..", __dir__)
SKILLS = File.join(ROOT, "plugins", "fulcrum-ai-toolkit", "skills")
CONTRACT_FAILURES = []

def read_skill(name, relative_path = "SKILL.md")
  File.read(File.join(SKILLS, name, relative_path))
end

def read_file(relative_path)
  File.read(File.join(ROOT, relative_path))
end

def assert(condition, message)
  CONTRACT_FAILURES << message unless condition
  condition
end

def assert_in_order(text, tokens, message)
  cursor = 0
  tokens.each do |token|
    position = text.index(token, cursor)
    unless position
      assert(false, "#{message}: missing or out-of-order #{token.inspect}")
      next
    end
    cursor = position + token.length
  end
end

def section_between(text, start_marker, end_marker, name)
  start_position = text.index(start_marker)
  unless start_position
    assert(false, "#{name}: missing start marker #{start_marker.inspect}")
    return ""
  end

  content_start = start_position + start_marker.length
  end_position = text.index(end_marker, content_start)
  unless end_position
    assert(false, "#{name}: missing end marker #{end_marker.inspect}")
    return ""
  end

  text[content_start...end_position]
end

app_builder = read_skill("fulcrum-app-builder")
product_knowledge = read_skill("fulcrum-product-knowledge")
data_events = read_skill("fulcrum-data-events")
data_events_runtime = read_skill("fulcrum-data-events", "resources/data-events-runtime-api.md")
data_event_examples = read_skill("fulcrum-data-events", "resources/data-event-examples.md")
app_extensions = read_skill("fulcrum-app-extensions")
extension_bridge = read_skill("fulcrum-app-extensions", "resources/extension-bridge-api.md")
report_building = read_skill("fulcrum-report-building")
report_reference = read_skill("fulcrum-report-building", "resources/report-template-reference.md")
readme = read_file("README.md")
coverage_map = read_file("plugins/fulcrum-ai-toolkit/docs/legacy-product-knowledge-coverage.md")

contract_documents = {
  "app builder" => app_builder,
  "product knowledge" => product_knowledge,
  "Data Events" => data_events,
  "Data Events runtime" => data_events_runtime,
  "App Extensions" => app_extensions,
  "extension bridge" => extension_bridge,
  "report building" => report_building,
  "report reference" => report_reference
}.freeze
tool_guidance_documents = contract_documents.merge(
  "README" => readme,
  "coverage map" => coverage_map,
  "Data Event examples" => data_event_examples
).freeze

# This is the exact subset referenced by layer-2 guidance, not the exhaustive
# server inventory. Full 53-tool parity belongs to the layer-6 contract suite.
allowed_app_mcp_tools = %w[
  fulcrum_expressions_data_events_reference
  fulcrum_expressions_explain
  fulcrum_expressions_list_functions
  fulcrum_extensions_explain
  fulcrum_extensions_generate
  fulcrum_extensions_list_patterns
  fulcrum_forms_create
  fulcrum_forms_get
  fulcrum_forms_update
  fulcrum_forms_validate
  fulcrum_reference_files_get
  fulcrum_reference_files_list
  fulcrum_reference_files_upload
  fulcrum_report_templates_create
  fulcrum_report_templates_delete
  fulcrum_report_templates_get
  fulcrum_report_templates_list
  fulcrum_report_templates_update
  fulcrum_reports_create
  fulcrum_schema_build_field
  fulcrum_schema_build_form
  fulcrum_schema_field_types
].sort.freeze
non_tool_identifiers = %w[fulcrum_parent_id].freeze

identifier_references = tool_guidance_documents.flat_map do |document_name, document|
  document.scan(/\bfulcrum_[a-z0-9_]+(?:\*)?/).map do |identifier|
    [document_name, identifier]
  end
end
wildcard_references = identifier_references.select { |_document, identifier| identifier.end_with?("*") }
assert(
  wildcard_references.empty?,
  "wildcard App MCP references remain: #{wildcard_references.map { |document, identifier| "#{document}:#{identifier}" }.join(", ")}"
)

referenced_app_mcp_tools = identifier_references
  .map(&:last)
  .uniq
  .reject { |identifier| non_tool_identifiers.include?(identifier) }
  .sort
unknown_app_mcp_tools = referenced_app_mcp_tools - allowed_app_mcp_tools
missing_app_mcp_tools = allowed_app_mcp_tools - referenced_app_mcp_tools
assert(unknown_app_mcp_tools.empty?, "unknown App MCP tools are referenced: #{unknown_app_mcp_tools.join(", ")}")
assert(missing_app_mcp_tools.empty?, "focused App MCP allowlist contains unreferenced tools: #{missing_app_mcp_tools.join(", ")}")

supported_domains = [
  "Forms and embedded Data Event scripts",
  "Field and form schema knowledge, builders, and validation",
  "Choice lists and classification sets",
  "Projects, global webhooks, and Reference Files",
  "Layer metadata",
  "Membership and role metadata",
  "Report Templates and report generation",
  "Expression and App Extension knowledge or generation"
]
supported_domains.each do |domain|
  assert(app_builder.include?(domain), "app builder omits supported App MCP domain #{domain}")
end

%w[Query\ API record\ CRUD media\ CRUD].each do |boundary|
  assert(app_builder.include?(boundary), "app builder omits unsupported boundary #{boundary}")
end

update_workflow = section_between(
  app_builder,
  "For an existing app:",
  "### Data Event scripts",
  "existing-form workflow"
)
assert_in_order(
  update_workflow,
  [
    "fulcrum_forms_get",
    "preserve every existing element key and inline-choice key",
    "fulcrum_schema_build_field",
    "explicit approval",
    "removed subtree",
    "removed_element_keys",
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
  update_workflow.include?("elements: composedElements") &&
    update_workflow.include?("removed_element_keys: removedElementKeys"),
  "existing-form update does not pass the complete elements payload with removed_element_keys"
)
assert(
  update_workflow.include?("Preservation is the default") &&
    update_workflow.include?("Omit `removed_element_keys` when nothing was removed"),
  "existing-form workflow does not keep preservation as the default"
)
product_update_workflow = section_between(
  product_knowledge,
  "For an existing-form element change:",
  "If form creation succeeds",
  "product router existing-form workflow"
)
assert_in_order(
  product_update_workflow,
  [
    "fulcrum_forms_get",
    "preservation as the default",
    "explicit user confirmation",
    "removed_element_keys",
    "fulcrum_forms_validate",
    "fulcrum_forms_update",
    "complete assembled `elements` array"
  ],
  "product router existing-form workflow"
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
  [data_events_runtime, product_knowledge].all? do |document|
    document.include?("LOADFILE(options, callback)") &&
      document.include?("optional `form_name` or `form_id`")
  end,
  "LOADFILE guidance does not distinguish the optional form_name and form_id keys"
)
assert(
  [data_events_runtime, product_knowledge].none? { |document| document.include?("form_name/form_id") },
  "ambiguous combined LOADFILE form key remains"
)
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
assert(
  report_building.include?("record.formValues.find('inspector_name')") &&
    report_building.include?(".displayValue") &&
    report_building.include?(".value") &&
    report_building.include?(".items"),
  "report examples do not use documented form-value access"
)
report_guidance = [product_knowledge, report_building, report_reference].join("\n")
assert(
  !report_guidance.match?(/record\.(?:getValue|getDisplayValue|getRepeatableValues)\s*\(/),
  "nonexistent record field helpers remain in report examples"
)
assert(
  report_reference.include?("| JSONREQUEST(options) |") &&
    report_reference.include?("| RENDER(feature, options, eachFunction) |") &&
    report_reference.include?("| RENDERVALUES(feature, options, eachFunction) |"),
  "report function signatures do not match the public reference"
)
assert(
  report_building.include?("| `PHOTOURL(id, options)` |") &&
    report_building.include?("| `SIGNATUREURL(id, options)` |"),
  "report workflow media URL signatures do not match the public reference"
)
assert(
  !report_guidance.match?(/JSONREQUEST\(url\)|RENDER\(elements, callback\)|RENDERVALUES\(callback\)/),
  "obsolete report function signatures remain"
)
assert(
  report_reference.include?("result.rows.forEach(function(row)") &&
    report_reference.include?("`rows` array") &&
    !report_guidance.include?("Returns an array of row objects"),
  "QUERY result guidance does not use the documented rows property"
)

combined_contract = contract_documents.values.join("\n")
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

contract_documents.each_value do |document|
  assert(document.match?(/^> Source: .*https:\/\//), "contract documentation lacks a linked Source note")
end

public_guidance_files = [
  File.join(ROOT, "README.md"),
  File.join(ROOT, "plugins", "fulcrum-ai-toolkit", "docs", "legacy-product-knowledge-coverage.md"),
  File.join(SKILLS, "fulcrum-app-builder", "SKILL.md"),
  File.join(SKILLS, "fulcrum-product-knowledge", "SKILL.md"),
  File.join(SKILLS, "fulcrum-data-events", "SKILL.md"),
  File.join(SKILLS, "fulcrum-data-events", "resources", "data-event-examples.md"),
  File.join(SKILLS, "fulcrum-data-events", "resources", "data-events-runtime-api.md"),
  File.join(SKILLS, "fulcrum-app-extensions", "SKILL.md"),
  File.join(SKILLS, "fulcrum-app-extensions", "resources", "extension-bridge-api.md"),
  File.join(SKILLS, "fulcrum-report-building", "SKILL.md"),
  File.join(SKILLS, "fulcrum-report-building", "resources", "report-template-reference.md")
].freeze
private_path = nil
public_guidance_files.each do |path|
  if File.foreach(path).any? do |line|
       line.match?(%r{/(?:Users|home)/|atlassian\.net|slack\.com|/mnt/skills/organization}i)
     end
    private_path = path
    break
  end
end
assert(
  private_path.nil?,
  "public toolkit content contains a private path or collaboration URL: #{private_path}"
)

unless CONTRACT_FAILURES.empty?
  warn "App MCP contract test failed:"
  CONTRACT_FAILURES.each { |failure| warn "- #{failure}" }
  exit 1
end

puts "App MCP contract test passed: exact tools, runtime signatures, and removal-safe updates"
