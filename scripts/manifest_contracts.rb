# frozen_string_literal: true

require "uri"

module ManifestContracts
  AGENT_PLUGIN_FIELDS = %w[
    $schema
    author
    description
    extensions
    homepage
    keywords
    license
    name
    repository
    version
  ].freeze
  AGENT_PLUGIN_SCHEMA = "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json"
  AGENT_PLUGIN_NAME = /\A(?!.*(?:--|\.\.))[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\z/

  CURSOR_FIELDS = %w[
    agents
    author
    category
    commands
    description
    displayName
    homepage
    hooks
    keywords
    license
    logo
    mcpServers
    minClientVersions
    name
    publisher
    repository
    rules
    skills
    tags
    variables
    version
  ].freeze
  CURSOR_NAME = /\A[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\z/
  SEMVER = /\A(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?\z/

  CLAUDE_FIELDS = %w[
    $schema
    author
    description
    homepage
    keywords
    license
    name
    repository
    skills
    version
  ].freeze
  CODEX_FIELDS = %w[
    author
    description
    homepage
    keywords
    license
    name
    repository
    skills
    version
  ].freeze

  module_function

  # Source: https://agent-plugins.org/specification#52-manifest-object
  def validate_agent_plugin(manifest)
    return ["manifest must be an object"] unless manifest.is_a?(Hash)

    errors = unknown_fields(manifest, AGENT_PLUGIN_FIELDS)
    errors << "$schema is required" unless manifest.key?("$schema")
    errors << "name is required" unless manifest.key?("name")
    errors << "$schema must identify Agent Plugins 1.0.0" unless manifest["$schema"] == AGENT_PLUGIN_SCHEMA
    errors.concat(validate_name(manifest["name"], AGENT_PLUGIN_NAME, 64))
    %w[version description homepage repository license].each do |field|
      errors << "#{field} must be a string" if manifest.key?(field) && !manifest[field].is_a?(String)
    end
    errors.concat(validate_author(manifest["author"], allowed_fields: %w[name email url], require_name: false)) if manifest.key?("author")
    errors.concat(validate_string_array(manifest["keywords"], "keywords")) if manifest.key?("keywords")
    if manifest.key?("extensions")
      extensions = manifest["extensions"]
      if !extensions.is_a?(Hash)
        errors << "extensions must be an object"
      elsif extensions.values.any? { |value| !value.is_a?(Hash) }
        errors << "each extensions value must be an object"
      end
    end
    errors
  end

  # Source: https://github.com/cursor/plugins/blob/main/schemas/plugin.schema.json
  def validate_cursor(manifest)
    return ["manifest must be an object"] unless manifest.is_a?(Hash)

    errors = unknown_fields(manifest, CURSOR_FIELDS)
    errors << "name is required" unless manifest.key?("name")
    errors.concat(validate_name(manifest["name"], CURSOR_NAME))
    %w[displayName description publisher license logo category].each do |field|
      errors << "#{field} must be a string" if manifest.key?(field) && !manifest[field].is_a?(String)
    end
    errors << "publisher must not be empty" if manifest["publisher"] == ""
    if manifest.key?("version") && !manifest["version"].is_a?(String)
      errors << "version must be a string"
    end
    if manifest.key?("author")
      errors.concat(
        validate_author(
          manifest["author"],
          allowed_fields: %w[name email],
          require_name: true,
          require_nonempty_name: true,
          validate_email: true
        )
      )
    end
    %w[homepage repository].each do |field|
      errors << "#{field} must be an absolute URI" if manifest.key?(field) && !absolute_uri?(manifest[field])
    end
    %w[keywords tags].each do |field|
      errors.concat(validate_string_array(manifest[field], field)) if manifest.key?(field)
    end
    %w[commands agents skills rules].each do |field|
      errors << "#{field} must be a string or string array" if manifest.key?(field) && !string_or_string_array?(manifest[field])
    end
    if manifest.key?("hooks") && !manifest["hooks"].is_a?(String) && !manifest["hooks"].is_a?(Hash)
      errors << "hooks must be a string or object"
    end
    errors.concat(validate_mcp_servers(manifest["mcpServers"])) if manifest.key?("mcpServers")
    errors.concat(validate_min_client_versions(manifest["minClientVersions"])) if manifest.key?("minClientVersions")
    errors.concat(validate_variables(manifest["variables"])) if manifest.key?("variables")
    errors
  end

  # Source: https://json.schemastore.org/claude-code-plugin-manifest.json
  # The upstream schema permits additional fields. This repository intentionally
  # accepts only the documented skills-only subset above for deterministic CI.
  def validate_claude(manifest)
    return ["manifest must be an object"] unless manifest.is_a?(Hash)

    # Repository policy: keep this adapter to the documented skills-only subset.
    errors = unknown_fields(manifest, CLAUDE_FIELDS)
    errors << "name is required" unless manifest.key?("name")
    errors << "name must be a non-empty string" unless manifest["name"].is_a?(String) && !manifest["name"].empty?
    %w[$schema version description repository license].each do |field|
      errors << "#{field} must be a string" if manifest.key?(field) && !manifest[field].is_a?(String)
    end
    errors << "homepage must be an absolute URI" if manifest.key?("homepage") && !absolute_uri?(manifest["homepage"])
    if manifest.key?("author")
      errors.concat(
        validate_author(
          manifest["author"],
          allowed_fields: %w[name email url],
          require_name: true,
          require_nonempty_name: true
        )
      )
    end
    errors.concat(validate_string_array(manifest["keywords"], "keywords")) if manifest.key?("keywords")
    errors.concat(validate_skill_paths(manifest["skills"], required: true, exact_path: "./skills/"))
    errors
  end

  # Source: https://developers.openai.com/plugins/build/plugins#manifest-fields
  # This package uses Codex's documented skills-only metadata subset.
  def validate_codex(manifest)
    return ["manifest must be an object"] unless manifest.is_a?(Hash)

    # Repository policy: keep this adapter to Codex's documented skills-only subset.
    errors = unknown_fields(manifest, CODEX_FIELDS)
    errors << "name is required" unless manifest.key?("name")
    errors.concat(validate_name(manifest["name"], CURSOR_NAME))
    if manifest.key?("version") && (!manifest["version"].is_a?(String) || !manifest["version"].match?(SEMVER))
      errors << "version must be semantic version X.Y.Z"
    end
    %w[description license].each do |field|
      errors << "#{field} must be a string" if manifest.key?(field) && !manifest[field].is_a?(String)
    end
    %w[homepage repository].each do |field|
      errors << "#{field} must be an absolute URI" if manifest.key?(field) && !absolute_uri?(manifest[field])
    end
    if manifest.key?("author")
      errors.concat(
        validate_author(
          manifest["author"],
          allowed_fields: %w[name email url],
          require_name: true,
          require_nonempty_name: true,
          validate_email: true
        )
      )
    end
    errors.concat(validate_string_array(manifest["keywords"], "keywords")) if manifest.key?("keywords")
    errors.concat(validate_skill_paths(manifest["skills"], required: true, exact_path: "./skills/"))
    errors
  end

  def unknown_fields(manifest, allowed)
    unknown = manifest.keys - allowed
    unknown.empty? ? [] : ["unsupported fields: #{unknown.join(", ")}"]
  end

  def validate_name(value, pattern, max_length = nil)
    return ["name must be a string"] unless value.is_a?(String)

    errors = []
    errors << "name must not be empty" if value.empty?
    errors << "name exceeds #{max_length} characters" if max_length && value.length > max_length
    errors << "name has an invalid format" unless value.match?(pattern)
    errors
  end

  def validate_author(
    author,
    allowed_fields:,
    require_name:,
    require_nonempty_name: false,
    validate_email: false
  )
    return ["author must be an object"] unless author.is_a?(Hash)

    errors = unknown_fields(author, allowed_fields)
    errors << "author.name is required" if require_name && !author.key?("name")
    author.each do |field, value|
      errors << "author.#{field} must be a string" unless value.is_a?(String)
    end
    errors << "author.name must not be empty" if require_nonempty_name && author["name"] == ""
    if validate_email && author.key?("email") &&
       !email_address?(author["email"])
      errors << "author.email must be an email address"
    end
    errors
  end

  def validate_string_array(value, field)
    return ["#{field} must be an array"] unless value.is_a?(Array)
    return [] if value.all? { |item| item.is_a?(String) }

    ["#{field} must contain only strings"]
  end

  def string_or_string_array?(value)
    value.is_a?(String) || (value.is_a?(Array) && value.all? { |item| item.is_a?(String) })
  end

  def validate_skill_paths(value, required:, exact_path: nil)
    return ["skills is required"] if required && value.nil?
    return [] if value.nil?

    paths = value.is_a?(String) ? [value] : value
    return ["skills must be a string or string array"] unless paths.is_a?(Array) && paths.all? { |path| path.is_a?(String) }
    return ["skills must not be empty"] if paths.empty?
    return ["skills must point exactly to #{exact_path}"] if exact_path && paths != [exact_path]
    return [] if paths.all? { |path| path.start_with?("./") }

    ["skills paths must start with ./"]
  end

  def absolute_uri?(value)
    value.is_a?(String) && URI.parse(value).absolute?
  rescue URI::InvalidURIError
    false
  end

  def email_address?(value)
    return false unless value.is_a?(String) && value.match?(URI::MailTo::EMAIL_REGEXP)

    local = value.split("@", 2).first
    !local.start_with?(".") && !local.end_with?(".") && !local.include?("..")
  end

  def validate_mcp_servers(value)
    valid = value.is_a?(String) ||
      value.is_a?(Hash) ||
      (value.is_a?(Array) && value.all? { |item| item.is_a?(String) || item.is_a?(Hash) })
    valid ? [] : ["mcpServers must be a string, object, or array of strings/objects"]
  end

  def validate_min_client_versions(value)
    return ["minClientVersions must be a non-empty object"] unless value.is_a?(Hash) && !value.empty?
    return [] if value.values.all? { |version| version.is_a?(String) && version.match?(SEMVER) }

    ["minClientVersions values must be semantic versions"]
  end

  def validate_variables(value)
    return ["variables must be an object"] unless value.is_a?(Hash)

    errors = []
    errors << "variables.type must equal object" unless value["type"] == "object"
    errors << "variables.properties must be an object" if value.key?("properties") && !value["properties"].is_a?(Hash)
    if value.key?("required")
      required = value["required"]
      unless required.is_a?(Array) && required.all? { |item| item.is_a?(String) } && required.uniq == required
        errors << "variables.required must be a unique string array"
      end
    end
    errors
  end
end
