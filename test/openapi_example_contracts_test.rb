#!/usr/bin/env ruby
# frozen_string_literal: true

require "json"
require "fileutils"
require "tmpdir"
require_relative "../scripts/openapi_example_contracts"

ROOT = File.expand_path("..", __dir__)
FIXTURES = File.join(__dir__, "fixtures", "openapi_examples")
OPENAPI = JSON.parse(
  File.read(File.join(ROOT, OpenapiExampleContracts::OPENAPI_RELATIVE_PATH))
)
VALIDATOR = OpenapiExampleContracts::Validator.new(OPENAPI)
SCHEMA = "FormRecordLinkFieldElement"

def assert(condition, message)
  return if condition

  warn "OpenAPI example contracts test failed: #{message}"
  exit 1
end

assert(OpenapiExampleContracts.validate_all(root: ROOT).empty?, "repository examples are invalid")

invalid_property = JSON.parse(File.read(File.join(FIXTURES, "invalid-property.json")))
property_errors = VALIDATOR.validate(invalid_property, SCHEMA)
assert(
  property_errors.any? { |error| error.include?('undocumented property "unknown_setting"') },
  "invalid-property fixture did not reject an undocumented field: #{property_errors.join('; ')}"
)

invalid_value = JSON.parse(File.read(File.join(FIXTURES, "invalid-value.json")))
value_errors = VALIDATOR.validate(invalid_value, SCHEMA)
assert(
  value_errors.any? { |error| error.include?("$.allow_existing_records: expected boolean") },
  "invalid-value fixture did not reject a schema-invalid value: #{value_errors.join('; ')}"
)

Dir.mktmpdir("openapi-example-inventory") do |root|
  unlisted = File.join(
    root,
    "plugins",
    "fulcrum-ai-toolkit",
    "skills",
    "future-skill",
    "examples",
    "unlisted.json"
  )
  FileUtils.mkdir_p(File.dirname(unlisted))
  File.write(unlisted, "{}\n")
  inventory_errors = OpenapiExampleContracts.validate_inventory(root)
  assert(
    inventory_errors.any? { |error| error.include?("unlisted.json: JSON example must map") },
    "unmapped JSON fixture silently bypassed inventory validation: #{inventory_errors.join('; ')}"
  )
end

puts "OpenAPI example contracts test passed: valid example accepted and 3 negative contracts rejected"
