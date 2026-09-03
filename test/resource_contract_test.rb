#!/usr/bin/env ruby
# frozen_string_literal: true

require "digest"
require "json"
require "pathname"
require_relative "../scripts/content_contracts"
require_relative "../scripts/file_contracts"

ROOT = File.expand_path("..", __dir__)
PLUGIN = File.join(ROOT, "plugins", "fulcrum-ai-toolkit")
SKILLS = File.join(PLUGIN, "skills")
COVERAGE = File.join(PLUGIN, "docs", "legacy-example-coverage.md")
INVENTORY = File.join(ROOT, "test", "data", "example-block-inventory.json")
MANAGED_DIRECTORIES = %w[resources examples assets].freeze
MAX_RESOURCE_BYTES = 100 * 1024
APPROVED_OVERSIZED_RESOURCES = {}.freeze
PUBLIC_OPENAPI = "https://raw.githubusercontent.com/fulcrumapp/api/v2/reference/rest-api.json"
PUBLIC_OPENAPI_DOCS = "https://docs.fulcrumapp.com/reference/openapi-and-postman-collection"

def assert(condition, message)
  return if condition

  warn "Resource contract test failed: #{message}"
  exit 1
end

def relative(path)
  Pathname.new(path).relative_path_from(Pathname.new(ROOT)).to_s
end

def markdown_links(path)
  text = FileContracts.read_text(path)
  inline = text.scan(
    /\]\(\s*(?:<([^>]+)>|([^\s)]+))(?:\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?\s*\)/
  ).map { |angle, plain| angle || plain }
  references = text.scan(
    /^\s*\[[^\]]+\]:\s*(?:<([^>]+)>|(\S+))/
  ).map { |angle, plain| angle || plain }
  html = text.scan(
    /<(?:a|img)\b[^>]*(?:href|src)=["']([^"']+)["']/i
  ).flatten
  (inline + references + html).uniq
end

def local_target(path, target)
  return if target.start_with?("http://", "https://", "mailto:")

  clean, fragment = target.split("#", 2)
  resolved = clean.nil? || clean.empty? ? path : File.expand_path(clean, File.dirname(path))
  [resolved, fragment]
end

def plugin_path?(path)
  path == PLUGIN || path.start_with?("#{PLUGIN}#{File::SEPARATOR}")
end

def markdown_anchors(path)
  counts = Hash.new(0)
  FileContracts.read_text(path).scan(/^\#{1,6}\s+(.+?)\s*\#*\s*$/).flatten.map do |heading|
    base = heading
      .gsub(/<[^>]+>/, "")
      .gsub(/\[([^\]]+)\]\([^)]+\)/, '\1')
      .delete("`*_")
      .downcase
      .gsub(/[^\p{Alnum}\s-]/, "")
      .strip
      .gsub(/\s+/, "-")
    ordinal = counts[base]
    counts[base] += 1
    ordinal.zero? ? base : "#{base}-#{ordinal}"
  end
end

def managed_file?(path)
  relative(path).split(File::SEPARATOR).any? { |part| MANAGED_DIRECTORIES.include?(part) }
end

def manifest_targets(cell)
  cell.to_s.scan(/\]\(([^)\s]+)\)/).flatten
end

def plugin_relative_from_coverage(target)
  File.expand_path(target, File.join(PLUGIN, "docs")).sub("#{PLUGIN}/", "")
end

snapshot_name = ["fulcrum-rest-api", ".json"].join
snapshot_digest = [
  "2befa5b402d371627cffea0423ec26ff1",
  "96d12b3b014d37e83e1dbe4acedef81"
].join
snapshot_path = File.join(SKILLS, "fulcrum-product-knowledge", "resources", snapshot_name)
assert(!File.exist?(snapshot_path), "retired generated authority snapshot exists")

distributable_files = FileContracts.files_under(PLUGIN)
distributable_text = distributable_files.map { |path| FileContracts.read_text(path) }.join("\n")
assert(!distributable_text.include?(snapshot_name), "distributable content names the retired snapshot")
assert(!distributable_text.include?(snapshot_digest), "distributable content retains the retired snapshot hash")

product_router = File.read(File.join(SKILLS, "fulcrum-product-knowledge", "SKILL.md"))
governance = File.read(
  File.join(SKILLS, "fulcrum-product-knowledge", "resources", "resource-governance.md")
)
[product_router, governance].each do |text|
  assert(text.include?(PUBLIC_OPENAPI), "REST authority lacks the canonical public OpenAPI URL")
  assert(text.include?(PUBLIC_OPENAPI_DOCS), "REST authority lacks the public OpenAPI documentation")
end
assert(
  governance.downcase.include?("live installed app mcp schemas"),
  "governance omits connector source precedence"
)
assert(governance.include?("offline"), "governance omits the offline tradeoff")
assert(governance.include?("100 KB"), "governance omits the generated snapshot exception threshold")

markdown_files = distributable_files.select { |path| File.extname(path).casecmp(".md").zero? }
incoming = []
markdown_files.each do |path|
  markdown_links(path).each do |target|
    local = local_target(path, target)
    next unless local
    resolved, fragment = local

    assert(plugin_path?(resolved), "local link escapes the distributable plugin in #{relative(path)}: #{target}")
    assert(File.exist?(resolved), "dangling local link in #{relative(path)}: #{target}")
    if fragment && File.file?(resolved) && File.extname(resolved).casecmp(".md").zero?
      assert(
        markdown_anchors(resolved).include?(fragment),
        "dangling local anchor in #{relative(path)}: #{target}"
      )
    end
    incoming << resolved
  end
end

managed_files = distributable_files.select { |path| managed_file?(path) }
managed_files.each do |path|
  next if File.basename(path) == "README.md"

  assert(incoming.include?(path), "orphaned managed file has no incoming link: #{relative(path)}")
end

Dir[File.join(SKILLS, "*", "{examples,assets}")].sort.each do |directory|
  next unless File.directory?(directory)

  index = File.join(directory, "README.md")
  assert(File.file?(index), "#{relative(directory)} has no README.md index")
  indexed = markdown_links(index).filter_map do |target|
    local_target(index, target)&.first
  end
  FileContracts.files_under(directory).each do |path|
    next if path == index

    assert(indexed.include?(path), "#{relative(path)} is missing from its sibling index")
  end
end

distributable_files.each do |path|
  text = FileContracts.read_text(path)
  assert(
    !ContentContracts.private_collaboration_url?(text),
    "private collaboration URL in #{relative(path)}"
  )
  assert(!ContentContracts.private_filesystem_path?(text), "private filesystem path in #{relative(path)}")
  assert(!ContentContracts.private_provenance?(text), "private provenance in #{relative(path)}")
  assert(
    ContentContracts.invalid_source_attributions(text).empty?,
    "Source attribution lacks a public URL in #{relative(path)}"
  )
end

oversized_resources = managed_files.select do |path|
  relative_path = relative(path)
  relative_path.split(File::SEPARATOR).include?("resources") &&
    File.size(path) > MAX_RESOURCE_BYTES
end
unapproved_oversized_resources = oversized_resources.reject do |path|
  approval = APPROVED_OVERSIZED_RESOURCES[relative(path)]
  approval.is_a?(String) && !approval.strip.empty?
end
assert(
  unapproved_oversized_resources.empty?,
  "skill resources exceed #{MAX_RESOURCE_BYTES} bytes without a reviewed exception: " \
    "#{unapproved_oversized_resources.map { |path| relative(path) }.join(", ")}"
)

source_index = File.read(
  File.join(SKILLS, "fulcrum-product-knowledge", "resources", "llms-txt-index.md")
)
assert(source_index.include?("https://docs.fulcrumapp.com/llms.txt"), "source index omits its upstream")
assert(source_index.include?("selected, reorganized index"), "source index does not declare selection behavior")
assert(source_index.include?("Refresh it from the named upstream"), "source index omits refresh expectations")
assert(!source_index.include?(PUBLIC_OPENAPI), "llms.txt index mixes in a non-llms.txt supplement")

inventory = JSON.parse(File.read(INVENTORY))
coverage = File.read(COVERAGE)
legacy_section = coverage.split("## Legacy example units", 2).last
  .split("## Externalized current blocks", 2).first
legacy_rows = legacy_section.each_line.select { |line| line.match?(/\A\| L\d+ \|/) }
actual_legacy = legacy_rows.map do |row|
  columns = row.split("|").map(&:strip)
  {
    "id" => columns[1],
    "disposition" => columns[3].delete("`"),
    "targets" => manifest_targets(columns[4]).map { |target| plugin_relative_from_coverage(target) }
  }
end
assert(actual_legacy == inventory.fetch("legacy_units"), "legacy 9-unit identity contract changed")

current_section = coverage.split("## Externalized current blocks", 2).last
current_rows = current_section.each_line.select { |line| line.match?(/\A\| C\d{2} \|/) }
actual_current = current_rows.map do |row|
  columns = row.split("|").map(&:strip)
  targets = manifest_targets(columns[6])
  assert(targets.length == 1, "current example #{columns[1]} does not have one target")
  {
    "id" => columns[1],
    "source" => columns[2].delete("`"),
    "ordinal" => Integer(columns[3]),
    "target" => plugin_relative_from_coverage(targets.first)
  }
end
assert(actual_current == inventory.fetch("current_blocks"), "current 49-block identity/source contract changed")

inventory.fetch("report_templates").each do |row|
  path = File.join(PLUGIN, row.fetch("path"))
  assert(File.file?(path), "hash-pinned report template is missing: #{row.fetch("path")}")
  assert(
    Digest::SHA256.hexdigest(File.binread(path)) == row.fetch("sha256"),
    "hash-pinned report template changed: #{row.fetch("path")}"
  )
end

puts format(
  "Resource contract test passed: %d managed files, %d local links, 49+9 example contracts, no resource over %d KB",
  managed_files.length,
  incoming.length,
  MAX_RESOURCE_BYTES / 1024
)
