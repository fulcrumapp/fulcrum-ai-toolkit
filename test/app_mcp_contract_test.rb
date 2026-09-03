#!/usr/bin/env ruby
# frozen_string_literal: true

require_relative "../scripts/content_contracts"

ROOT = File.expand_path("..", __dir__)
SKILLS = File.join(ROOT, "plugins", "fulcrum-ai-toolkit", "skills")

def read_skill(name, relative_path = "SKILL.md")
  File.read(File.join(SKILLS, name, relative_path))
end

def read_file(relative_path)
  File.read(File.join(ROOT, relative_path))
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

def section_between(text, start_marker, end_marker, name)
  start_position = text.index(start_marker)
  assert(start_position, "#{name}: missing start marker #{start_marker.inspect}")

  content_start = start_position + start_marker.length
  end_position = text.index(end_marker, content_start)
  assert(end_position, "#{name}: missing end marker #{end_marker.inspect}")

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
integration_patterns = read_skill("fulcrum-integration-patterns")
gis_mapping = read_skill("fulcrum-gis-mapping")
query_api = read_skill("fulcrum-query-api")
access_management = read_skill("fulcrum-access-management")
data_migration = read_skill("fulcrum-data-migration")
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
  "report reference" => report_reference,
  "integration patterns" => integration_patterns,
  "GIS mapping" => gis_mapping,
  "Query API" => query_api,
  "access management" => access_management,
  "data migration" => data_migration
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
  fulcrum_layers_get
  fulcrum_layers_list
  fulcrum_memberships_list
  fulcrum_reference_files_get
  fulcrum_reference_files_list
  fulcrum_reference_files_upload
  fulcrum_report_templates_create
  fulcrum_report_templates_delete
  fulcrum_report_templates_get
  fulcrum_report_templates_list
  fulcrum_report_templates_update
  fulcrum_reports_create
  fulcrum_roles_list
  fulcrum_schema_build_field
  fulcrum_schema_build_form
  fulcrum_schema_field_types
  fulcrum_webhooks_create
  fulcrum_webhooks_delete
  fulcrum_webhooks_get
  fulcrum_webhooks_list
  fulcrum_webhooks_update
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
assert(
  integration_patterns.include?("App MCP has no Workflow CRUD tools"),
  "integration skill invents or omits the Workflow boundary"
)
assert(
  gis_mapping.include?("read-only layer inspection"),
  "GIS skill omits the read-only App MCP layer boundary"
)
assert(
  access_management.match?(/read-only\s+organization membership and role\/permission inspection/),
  "access skill omits the read-only App MCP account boundary"
)
assert(
  query_api.include?("Query API execution is outside App MCP"),
  "Query skill omits the App MCP execution boundary"
)
assert(
  data_migration.include?("App MCP is not a migration executor"),
  "migration skill omits the App MCP migration boundary"
)

contract_documents.each_value do |document|
  assert(document.match?(/^> Source: .*https:\/\//), "contract documentation lacks a linked Source note")
end

public_files = [
  File.join(ROOT, "README.md"),
  File.join(ROOT, "marketplace.json"),
  File.join(ROOT, ".claude-plugin", "marketplace.json"),
  File.join(ROOT, ".github", "plugin", "marketplace.json"),
  File.join(ROOT, ".agents", "plugins", "marketplace.json"),
  File.join(ROOT, "plugins", "fulcrum-ai-toolkit", ".mcp.json")
] +
  Dir[File.join(ROOT, "plugins", "fulcrum-ai-toolkit", "**", "*.{md,json,yaml,yml}")] +
  Dir[File.join(ROOT, "plugins", "fulcrum-ai-toolkit", ".*-plugin", "*.{md,json,yaml,yml}")]
required_hidden_adapters = %w[
  .claude-plugin/plugin.json
  .codex-plugin/plugin.json
  .cursor-plugin/plugin.json
  .hermes-plugin/plugin.yaml
  .mcp.json
].map { |path| File.join(ROOT, "plugins", "fulcrum-ai-toolkit", path) }
assert(
  (required_hidden_adapters - public_files).empty?,
  "public privacy scan omits hidden plugin adapters"
)
public_content = public_files.map { |path| File.read(path) }.join("\n")
assert(
  !public_content.match?(%r{/(?:Users|home)/|atlassian\.net|slack\.com|/mnt/skills/organization|github\.com/fulcrumapp/app-mcp}i),
  "public toolkit content contains a private path or collaboration URL"
)
assert(
  !ContentContracts.private_provenance?(public_content),
  "public toolkit content contains private person or customer provenance"
)
assert(
  ContentContracts.private_provenance?("(internal partner deep dive)"),
  "private provenance detector misses its neutral fixture"
)
assert(
  ContentContracts.private_provenance?("https://docs.example.com/source (internal partner interview)"),
  "unrelated public URL masks private provenance"
)
assert(
  !ContentContracts.private_provenance?("(public workshop https://docs.example.com/source)"),
  "private provenance detector rejects a public source fixture"
)
assert(
  ContentContracts.private_provenance?("(partner interview https://)"),
  "private provenance detector accepts a malformed URL"
)
assert(
  ContentContracts.private_provenance?("(partner workshop http://localhost/source)"),
  "private provenance detector accepts a local URL"
)
[
  "(partner interview https://bad..example.com/source)",
  "(partner interview https://-bad.example.com/source)",
  "(partner interview https://wiki.corp/source)",
  "(partner interview https://service.home.arpa/source)",
  "(partner interview http://127.1/source)",
  "(partner interview http://127.0.0.1./source)",
  "(partner interview http://0x7f.0x0.0x0.0x1/source)",
  "(partner interview https://wiki.corp./source)",
  "(partner interview https://source.example/source)",
  "(partner interview\nnotes)",
  "(partner\ninterview)"
].each do |fixture|
  assert(
    ContentContracts.private_provenance?(fixture),
    "private provenance detector misses a malformed, private, or wrapped fixture"
  )
end

[
  "> Source: private notes",
  "   > **Source:** private notes",
  "> > __Source:__ private notes",
  "- Source: private notes",
  "> **Source**: private notes",
  "1. __Source__: private notes"
].each do |fixture|
  assert(
    !ContentContracts.invalid_source_attributions(fixture).empty?,
    "Source attribution detector misses a neutral Markdown fixture"
  )
end
assert(
  ContentContracts.invalid_source_attributions("> **Source:** https://docs.example.com/source").empty?,
  "Source attribution detector rejects a public URL"
)

puts "App MCP contract test passed: exact tools, runtime signatures, and removal-safe updates"
