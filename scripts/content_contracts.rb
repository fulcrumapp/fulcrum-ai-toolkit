# frozen_string_literal: true

require "uri"

module ContentContracts
  SOURCE_LABEL = /\A(?:Source:|\*\*Source(?::\*\*|\*\*:)|__Source(?::__|__:))/i
  PROVENANCE_LABEL = /\A(?:Provenance:|\*\*Provenance(?::\*\*|\*\*:)|__Provenance(?::__|__:))/i
  INVENTORY_LABEL = /\A(?:Inventory fingerprint:|\*\*Inventory fingerprint(?::\*\*|\*\*:)|__Inventory fingerprint(?::__|__:))/i
  RESEARCH_EVENT = /(?:deep[ -]dive|workshop|interview|field[ -]visit|(?:customer|client|internal)[ -]session|(?:customer|client)[ -]call)/i
  PROPER_TOKEN = /[A-Z][\p{L}0-9&.'-]+/
  ENTITY = /(?:#{PROPER_TOKEN.source}(?:\s+#{PROPER_TOKEN.source}){1,3}|[A-Z][a-z0-9]+[A-Z][A-Za-z0-9&.'-]*|[A-Z]{2,})/
  ATTRIBUTION_SEPARATOR = /[\s,;:()—-]{1,8}/
  ATTRIBUTION = /(?:#{ENTITY.source}#{ATTRIBUTION_SEPARATOR.source}(?i:#{RESEARCH_EVENT.source})|(?i:#{RESEARCH_EVENT.source})#{ATTRIBUTION_SEPARATOR.source}#{ENTITY.source}|(?i:#{RESEARCH_EVENT.source})\s+notes?\s+(?:from|by)\s+#{ENTITY.source})/
  AFFILIATION = /#{ENTITY.source}\s+(?:at|from)\s+(?:#{ENTITY.source}|#{PROPER_TOKEN.source})/
  PRIVATE_PATH = %r{\A/(?:Users|home|mnt)(?:/|\z)}i
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

  # This detects attribution-shaped prose, not arbitrary names or personal data.
  def private_provenance?(text)
    non_source_text = text.each_line.reject do |line|
      normalized = normalize_container_prefix(line)
      normalized.match?(SOURCE_LABEL) ||
        normalized.match?(INVENTORY_LABEL)
    end.join
    non_source_text.match?(ATTRIBUTION)
  end

  def invalid_source_attributions(text)
    text.each_line.filter_map do |line|
      normalized = normalize_container_prefix(line)
      next line.strip if normalized.match?(PROVENANCE_LABEL)
      next unless normalized.match?(SOURCE_LABEL)
      next line.strip unless public_url?(normalized)

      unlinked = normalized
        .sub(SOURCE_LABEL, "")
        .gsub(/\[[^\]]*\]\((?:<https?:\/\/[^>]+>|https?:\/\/[^)]+)\)/i, "")
        .gsub(%r{https?://[^\s"'`<>]+}i, "")
      line.strip if unlinked.match?(AFFILIATION) || unlinked.match?(ATTRIBUTION)
    end
  end

  def invalid_inventory_fingerprints(text, relative_path:, allowed_path:)
    lines = text.each_line.filter_map do |line|
      normalized = normalize_container_prefix(line)
      line.strip if normalized.match?(INVENTORY_LABEL)
    end
    relative_path == allowed_path ? [] : lines
  end

  def private_filesystem_path?(text)
    uris = URI.extract(text, %w[file http https])
    return true if uris.any? { |candidate| private_file_uri?(candidate) }

    without_web_urls = uris
      .select { |candidate| candidate.match?(/\Ahttps?:/i) }
      .reduce(text) { |content, candidate| content.gsub(candidate, "") }
    without_web_urls.scan(%r{(?:\A|[\s"'`(\[\{:=>])(/[^\s"'`<>]*)}).flatten.any? do |path|
      path.match?(PRIVATE_PATH)
    end
  end

  # Layer 3 deliberately bans fence marker tokens rather than parsing Markdown.
  def fence_marker_token?(text)
    text.include?("```") || text.include?("~~~")
  end

  def private_file_uri?(candidate)
    uri = URI.parse(candidate)
    uri.scheme&.casecmp("file")&.zero? && uri.path.match?(PRIVATE_PATH)
  rescue URI::InvalidURIError
    false
  end

  def public_url?(text)
    URI.extract(text, %w[http https]).any? do |candidate|
      uri = URI.parse(candidate)
      host = uri.host&.downcase&.sub(/\.\z/, "")
      next false unless uri.is_a?(URI::HTTP) && public_dns_name?(host)

      numeric_host = host.split(".").all? { |label| label.match?(/\A(?:\d+|0x[0-9a-f]+)\z/i) }
      !numeric_host && !host.include?(":")
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
