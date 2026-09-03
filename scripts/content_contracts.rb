# frozen_string_literal: true

require "uri"

module ContentContracts
  ATTRIBUTION_PATTERN = /\([^)]{0,500}(?:deep[ \t\r\n-]+dive|workshop|interview)[^)]{0,500}\)/i
  SOURCE_LABEL = /\A(?:Source:|\*\*Source(?::\*\*|\*\*:)|__Source(?::__|__:))/i
  PRIVATE_HOST_SUFFIXES = %w[
    corp
    example
    home
    home.arpa
    internal
    invalid
    lan
    local
    localhost
    onion
    test
  ].freeze

  module_function

  def private_provenance?(text)
    text.scan(ATTRIBUTION_PATTERN).any? do |attribution|
      !public_url?(attribution)
    end
  end

  def invalid_source_attributions(text)
    text.each_line.filter_map do |line|
      normalized = normalize_container_prefix(line)
      next unless normalized.match?(SOURCE_LABEL)
      next if public_url?(normalized)

      line.strip
    end
  end

  def public_url?(text)
    URI.extract(text, %w[http https]).any? do |candidate|
      uri = URI.parse(candidate)
      host = uri.host&.downcase&.sub(/\.\z/, "")
      next false unless uri.is_a?(URI::HTTP) && public_dns_name?(host)
      numeric_host = host.split(".").all? { |label| label.match?(/\A(?:\d+|0x[0-9a-f]+)\z/i) }
      next false if numeric_host || host.include?(":")

      true
    rescue URI::InvalidURIError
      false
    end
  end

  def public_dns_name?(host)
    return false unless host.is_a?(String) && host.length <= 253

    labels = host.split(".")
    return false if labels.length < 2
    return false if PRIVATE_HOST_SUFFIXES.any? { |suffix| host == suffix || host.end_with?(".#{suffix}") }

    labels.all? do |label|
      label.length.between?(1, 63) &&
        label.match?(/\A[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\z/i)
    end
  end

  def normalize_container_prefix(source_line)
    line = source_line.lstrip
    loop do
      normalized = line.sub(/\A>\s?/, "").sub(/\A(?:[-+*]|\d+[.)])\s+/, "").lstrip
      break if normalized == line

      line = normalized
    end
    line
  end
end
