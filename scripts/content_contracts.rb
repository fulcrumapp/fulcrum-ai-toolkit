# frozen_string_literal: true

require "uri"

module ContentContracts
  RESEARCH_EVENT_PATTERN = /(?:deep[ \t\r\n-]+dive|workshop|interview|field[ -]visit|(?:customer|client|internal|research)[ -]session|(?:customer|client)[ -]call)/i
  PRIVATE_EVENT_PATTERN = /\b(?:customer|client|internal|private)(?:\s+\p{L}+){0,2}\s+(?:deep[ \t\r\n-]+dive|workshop|interview|field[ -]visit|session|call)\b/i
  NAMED_EVENT_PATTERN = /[A-Z][\p{L}'-]+(?:\s+[A-Z][\p{L}'-]+){1,3}\s*,\s*[A-Z][\p{L}&.'-]+(?:\s+[A-Z][\p{L}&.'-]+){0,3}\s+(?i:#{RESEARCH_EVENT_PATTERN.source})/
  NAMED_AFFILIATION_EVENT_PATTERN = /[A-Z][\p{L}'-]+(?:\s+[A-Z][\p{L}'-]+){1,3}\s+(?:at|from)\s+[A-Z][\p{L}&.'-]+(?:\s+[A-Z][\p{L}&.'-]+){0,3}[^\n]{0,100}(?i:#{RESEARCH_EVENT_PATTERN.source})/
  PRIVATE_AFFILIATION_PATTERN = /\b(?:at|from)\s+(?:[A-Z][\p{L}&.'-]*\s+){0,4}(?:Customer|Client)\b/
  SOURCE_LABEL = /\A(?:Source:|\*\*Source(?::\*\*|\*\*:)|__Source(?::__|__:))/i
  PROVENANCE_LABEL = /\A(?:Provenance:|\*\*Provenance(?::\*\*|\*\*:)|__Provenance(?::__|__:))/i
  INVENTORY_LABEL = /\A(?:Inventory fingerprint:|\*\*Inventory fingerprint(?::\*\*|\*\*:)|__Inventory fingerprint(?::__|__:))/i
  PRIVATE_FILESYSTEM_PATH = %r{
    (?:\A|(?<=[\s"'`(\[\{:=>]))/(?:Users|home|mnt)(?:/|\z)|
    file:/+(?:Users|home|mnt)(?:/|\z)
  }ix
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
    return true if text.match?(NAMED_EVENT_PATTERN) || text.match?(NAMED_AFFILIATION_EVENT_PATTERN)
    return true if text.match?(PRIVATE_EVENT_PATTERN)

    text.each_line.any? do |line|
      normalized = normalize_container_prefix(line)
      attribution_line = normalized.match?(SOURCE_LABEL) || normalized.match?(PROVENANCE_LABEL)
      attribution_line &&
        (normalized.match?(RESEARCH_EVENT_PATTERN) || normalized.match?(PRIVATE_AFFILIATION_PATTERN))
    end
  end

  def private_filesystem_path?(text)
    without_http_urls = text.gsub(%r{https?://[^\s"'`<>]+}i, "")
    without_http_urls.match?(PRIVATE_FILESYSTEM_PATH)
  end

  def invalid_source_attributions(text)
    text.each_line.filter_map do |line|
      normalized = normalize_container_prefix(line)
      next line.strip if normalized.match?(PROVENANCE_LABEL)
      next unless normalized.match?(SOURCE_LABEL)
      next if public_url?(normalized)

      line.strip
    end
  end

  def invalid_inventory_fingerprints(text, relative_path:, allowed_path:)
    lines = text.each_line.filter_map do |line|
      normalized = normalize_container_prefix(line)
      line.strip if normalized.match?(INVENTORY_LABEL)
    end
    relative_path == allowed_path ? [] : lines
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
      if (container = line.match(/\A> ?/))
        line = line[container[0].length..]
      elsif (container = line.match(/\A(?:[-+*]|\d{1,9}[.)])\s+/))
        line = line[container[0].length..]
      elsif (container = line.match(/\A\#{1,6}[ \t]+/))
        line = line[container[0].length..]
      else
        break
      end
      line = line.lstrip
    end
    line
  end
end
