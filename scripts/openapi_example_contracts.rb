# frozen_string_literal: true

require "json"
require "pathname"

module OpenapiExampleContracts
  ROOT = File.expand_path("..", __dir__)
  OPENAPI_RELATIVE_PATH =
    "plugins/fulcrum-ai-toolkit/skills/fulcrum-product-knowledge/resources/fulcrum-rest-api.json"
  EXAMPLE_ROOT_RELATIVE_PATH = "plugins/fulcrum-ai-toolkit/skills"

  SCHEMA_MAPPINGS = {
    "plugins/fulcrum-ai-toolkit/skills/fulcrum-app-design/assets/record-link-field.json" =>
      "FormRecordLinkFieldElement"
  }.freeze

  # Add JSON examples that intentionally are not REST API documents here with a
  # durable explanation. Unlisted JSON under examples/ or assets/ fails validation.
  NON_OPENAPI_JSON = {}.freeze

  class Validator
    def initialize(openapi)
      @openapi = openapi
    end

    def validate(document, schema_name)
      schema = @openapi.dig("components", "schemas", schema_name)
      return ["OpenAPI component schema #{schema_name.inspect} does not exist"] unless schema

      validate_schema(document, schema, "$", strict_properties: true)
    end

    private

    def validate_schema(value, schema, path, strict_properties:, allowed_properties: nil)
      return [] if schema == true
      return ["#{path}: schema rejects every value"] if schema == false

      schema = resolve(schema)
      return ["#{path}: null is not allowed"] if value.nil? && !nullable?(schema)
      return [] if value.nil?

      errors = []
      errors.concat(validate_compositions(value, schema, path, strict_properties))
      errors.concat(validate_enum(value, schema, path))
      errors.concat(validate_type(value, schema, path))
      return errors unless errors.empty?

      case value
      when Hash
        properties = schema.fetch("properties", {})
        combined_properties = allowed_properties || property_names(schema)
        Array(schema["required"]).each do |name|
          errors << "#{path}: missing required property #{name.inspect}" unless value.key?(name)
        end

        value.each do |name, child|
          if properties.key?(name)
            errors.concat(
              validate_schema(child, properties.fetch(name), "#{path}.#{name}", strict_properties: strict_properties)
            )
          elsif schema["additionalProperties"].is_a?(Hash)
            errors.concat(
              validate_schema(
                child,
                schema.fetch("additionalProperties"),
                "#{path}.#{name}",
                strict_properties: strict_properties
              )
            )
          end
        end

        if strict_properties && !properties.empty? && schema["additionalProperties"] != true
          (value.keys - combined_properties).sort.each do |name|
            errors << "#{path}: undocumented property #{name.inspect}"
          end
        elsif schema["additionalProperties"] == false
          (value.keys - properties.keys).sort.each do |name|
            errors << "#{path}: additional property #{name.inspect} is not allowed"
          end
        end
      when Array
        if schema["minItems"] && value.length < schema["minItems"]
          errors << "#{path}: expected at least #{schema['minItems']} items"
        end
        if schema["maxItems"] && value.length > schema["maxItems"]
          errors << "#{path}: expected at most #{schema['maxItems']} items"
        end
        if schema["items"]
          value.each_with_index do |item, index|
            errors.concat(
              validate_schema(item, schema["items"], "#{path}[#{index}]", strict_properties: strict_properties)
            )
          end
        end
      when String
        errors << "#{path}: is shorter than #{schema['minLength']} characters" if schema["minLength"] && value.length < schema["minLength"]
        errors << "#{path}: is longer than #{schema['maxLength']} characters" if schema["maxLength"] && value.length > schema["maxLength"]
        errors << "#{path}: does not match #{schema['pattern'].inspect}" if schema["pattern"] && !Regexp.new(schema["pattern"]).match?(value)
      when Numeric
        errors << "#{path}: must be at least #{schema['minimum']}" if schema["minimum"] && value < schema["minimum"]
        errors << "#{path}: must be at most #{schema['maximum']}" if schema["maximum"] && value > schema["maximum"]
      end

      errors
    end

    def validate_compositions(value, schema, path, strict_properties)
      errors = []
      if schema["allOf"]
        allowed = property_names(schema)
        schema["allOf"].each do |subschema|
          errors.concat(
            validate_schema(
              value,
              subschema,
              path,
              strict_properties: strict_properties,
              allowed_properties: allowed
            )
          )
        end
      end

      if schema["anyOf"]
        matches = schema["anyOf"].count do |subschema|
          validate_schema(value, subschema, path, strict_properties: strict_properties).empty?
        end
        errors << "#{path}: does not match any allowed schema" if matches.zero?
      end

      if schema["oneOf"]
        matches = schema["oneOf"].count do |subschema|
          validate_schema(value, subschema, path, strict_properties: strict_properties).empty?
        end
        errors << "#{path}: must match exactly one allowed schema (matched #{matches})" unless matches == 1
      end

      errors
    end

    def validate_enum(value, schema, path)
      return [] unless schema.key?("enum") && !schema["enum"].include?(value)

      ["#{path}: #{value.inspect} is not one of #{schema['enum'].map(&:inspect).join(', ')}"]
    end

    def validate_type(value, schema, path)
      types = Array(schema["type"]).compact
      return [] if types.empty? || types.any? { |type| type_matches?(value, type) }

      ["#{path}: expected #{types.join(' or ')}, got #{json_type(value)}"]
    end

    def property_names(schema)
      schema = resolve(schema)
      names = schema.fetch("properties", {}).keys
      Array(schema["allOf"]).each { |subschema| names.concat(property_names(subschema)) }
      names.uniq
    end

    def resolve(schema)
      return schema unless schema.is_a?(Hash) && schema["$ref"]

      pointer = schema.fetch("$ref")
      raise ArgumentError, "unsupported non-local OpenAPI reference #{pointer.inspect}" unless pointer.start_with?("#/")

      pointer.delete_prefix("#/").split("/").reduce(@openapi) do |document, token|
        document.fetch(token.gsub("~1", "/").gsub("~0", "~"))
      end
    end

    def nullable?(schema)
      schema["nullable"] == true || Array(schema["type"]).include?("null")
    end

    def type_matches?(value, type)
      case type
      when "null" then value.nil?
      when "object" then value.is_a?(Hash)
      when "array" then value.is_a?(Array)
      when "string" then value.is_a?(String)
      when "integer" then value.is_a?(Integer)
      when "number" then value.is_a?(Numeric)
      when "boolean" then value == true || value == false
      else false
      end
    end

    def json_type(value)
      return "null" if value.nil?
      return "object" if value.is_a?(Hash)
      return "array" if value.is_a?(Array)
      return "boolean" if value == true || value == false
      return "integer" if value.is_a?(Integer)
      return "number" if value.is_a?(Numeric)
      return "string" if value.is_a?(String)

      value.class.name
    end
  end

  module_function

  def validate_all(root: ROOT)
    openapi_path = File.join(root, OPENAPI_RELATIVE_PATH)
    openapi = JSON.parse(File.read(openapi_path))
    validator = Validator.new(openapi)
    errors = validate_inventory(root)

    SCHEMA_MAPPINGS.each do |relative_path, schema_name|
      path = File.join(root, relative_path)
      next unless File.file?(path)

      document = JSON.parse(File.read(path))
      validator.validate(document, schema_name).each do |error|
        errors << "#{relative_path} against #{schema_name}: #{error}"
      end
    rescue JSON::ParserError => e
      errors << "#{relative_path}: invalid JSON (#{e.message})"
    end

    errors
  rescue Errno::ENOENT => e
    ["OpenAPI example validation cannot read #{Pathname.new(e.message).basename}: #{e.message}"]
  rescue JSON::ParserError => e
    ["#{OPENAPI_RELATIVE_PATH}: invalid JSON (#{e.message})"]
  end

  def validate_inventory(root)
    example_root = File.join(root, EXAMPLE_ROOT_RELATIVE_PATH)
    discovered = Dir[
      File.join(example_root, "*", "examples", "**", "*.json"),
      File.join(example_root, "*", "assets", "**", "*.json")
    ].map { |path| Pathname.new(path).relative_path_from(Pathname.new(root)).to_s }.sort

    configured = (SCHEMA_MAPPINGS.keys + NON_OPENAPI_JSON.keys).sort
    errors = []
    (discovered - configured).each do |path|
      errors << "#{path}: JSON example must map to an OpenAPI component schema or have an explicit NON_OPENAPI_JSON reason"
    end
    (configured - discovered).each do |path|
      errors << "#{path}: configured JSON example does not exist"
    end
    (SCHEMA_MAPPINGS.keys & NON_OPENAPI_JSON.keys).each do |path|
      errors << "#{path}: cannot be both schema-mapped and excluded"
    end
    NON_OPENAPI_JSON.each do |path, reason|
      errors << "#{path}: NON_OPENAPI_JSON reason must be specific" if reason.to_s.strip.empty?
    end
    errors
  end
end
