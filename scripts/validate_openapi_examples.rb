#!/usr/bin/env ruby
# frozen_string_literal: true

require_relative "openapi_example_contracts"

errors = OpenapiExampleContracts.validate_all
if errors.empty?
  puts "OpenAPI example validation passed: #{OpenapiExampleContracts::SCHEMA_MAPPINGS.length} schema-mapped JSON example"
  exit 0
end

warn "OpenAPI example validation failed:"
errors.each { |error| warn "- #{error}" }
exit 1
