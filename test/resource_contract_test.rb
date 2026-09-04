#!/usr/bin/env ruby
# frozen_string_literal: true

require "digest"
require "fileutils"
require "json"
require "open3"
require "pathname"
require "tmpdir"
require "uri"
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
BASE_SNAPSHOT_COMMIT = "ecf12093cf454ff6c1daa3f0b434bfef54ce74b8"

def assert(condition, message)
  return if condition

  warn "Resource contract test failed: #{message}"
  exit 1
end

def relative(path)
  Pathname.new(path).relative_path_from(Pathname.new(ROOT)).to_s
end

def file_entry(path)
  content = File.binread(path)
  {
    path: path,
    size: content.bytesize,
    sha256: Digest::SHA256.hexdigest(content),
    text: content.encode("UTF-8", invalid: :replace, undef: :replace)
  }
end

def markdown_links(text)
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

def markdown_anchors(text)
  counts = Hash.new(0)
  text.scan(/^\#{1,6}\s+(.+?)\s*\#*\s*$/).flatten.map do |heading|
    # This value is only normalized into a Markdown fragment identifier; it is never rendered as HTML.
    base = heading
      .delete("<>")
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

def normalized_public_urls(text, source:)
  markdown_links(text)
    .flat_map { |target| URI.extract(target, %w[http https]) }
    .map do |url|
      URI.parse(url).normalize
    rescue URI::InvalidURIError
      assert(false, "invalid public URL in #{source}: #{url}")
    end
end

def resource_policy_violations(entries, forbidden_digest:, approvals:)
  {
    retired_digest: entries.select { |entry| entry.fetch(:sha256) == forbidden_digest },
    oversized: entries.select do |entry|
      next false unless entry.fetch(:size) > MAX_RESOURCE_BYTES

      rationale = approvals[relative(entry.fetch(:path))]
      !rationale.is_a?(String) || rationale.strip.empty?
    end
  }
end

def managed_file?(path)
  relative(path).split(File::SEPARATOR).any? { |part| MANAGED_DIRECTORIES.include?(part) }
end

def manifest_targets(cell)
  cell.to_s.scan(/\]\(([^)\s]+)\)/).flatten
end

def plugin_relative_from_coverage(target)
  Pathname.new(File.expand_path(target, File.join(PLUGIN, "docs")))
    .relative_path_from(Pathname.new(PLUGIN))
    .to_s
end

snapshot_name = ["fulcrum-rest-api", ".json"].join
snapshot_digest = "2befa5b402d371627cffea0423ec26ff196d12b3b014d37e83e1dbe4acedef81"
assert(snapshot_digest.match?(/\A[0-9a-f]{64}\z/), "retired snapshot digest is not a SHA-256 hex value")
snapshot_relative_path = File.join(
  "plugins",
  "fulcrum-ai-toolkit",
  "skills",
  "fulcrum-product-knowledge",
  "resources",
  snapshot_name
)
snapshot_path = File.join(ROOT, snapshot_relative_path)
assert(!File.exist?(snapshot_path), "retired generated authority snapshot exists")

distributable_files = FileContracts.files_under(PLUGIN)
distributable_entries = distributable_files.map { |path| file_entry(path) }
text_by_path = distributable_entries.to_h { |entry| [entry.fetch(:path), entry.fetch(:text)] }
distributable_text = distributable_entries.map { |entry| entry.fetch(:text) }.join("\n")
assert(!distributable_text.include?(snapshot_name), "distributable content names the retired snapshot")

policy_violations = resource_policy_violations(
  distributable_entries,
  forbidden_digest: snapshot_digest,
  approvals: APPROVED_OVERSIZED_RESOURCES
)
assert(
  policy_violations.fetch(:retired_digest).empty?,
  "distributable content retains the retired snapshot bytes: " \
    "#{policy_violations.fetch(:retired_digest).map { |entry| relative(entry.fetch(:path)) }.join(", ")}"
)
assert(
  policy_violations.fetch(:oversized).empty?,
  "distributable files exceed #{MAX_RESOURCE_BYTES} bytes without a reviewed exception: " \
    "#{policy_violations.fetch(:oversized).map { |entry| relative(entry.fetch(:path)) }.join(", ")}"
)

snapshot_bytes, snapshot_error, snapshot_status = Open3.capture3(
  "git",
  "show",
  "#{BASE_SNAPSHOT_COMMIT}:#{snapshot_relative_path}",
  chdir: ROOT
)
assert(snapshot_status.success?, "cannot load exact retired snapshot from local Git: #{snapshot_error.strip}")
assert(snapshot_bytes.bytesize == 412_082, "retired base snapshot size changed")
assert(Digest::SHA256.hexdigest(snapshot_bytes) == snapshot_digest, "retired base snapshot digest changed")

Dir.mktmpdir("resource-contract-mutations") do |directory|
  mutation_root = File.join(directory, "plugin")
  mutation_paths = [
    File.join(mutation_root, "skills", "fulcrum-product-knowledge", ".rest-authority.json"),
    File.join(mutation_root, "docs", "rest-authority-copy")
  ]
  mutation_paths.each do |path|
    FileUtils.mkdir_p(File.dirname(path))
    File.binwrite(path, snapshot_bytes)
  end
  mutation_entries = FileContracts.files_under(mutation_root).map { |path| file_entry(path) }
  assert(
    mutation_entries.map { |entry| entry.fetch(:path) }.sort == mutation_paths.sort,
    "shared traversal misses a renamed hidden or non-resource snapshot copy"
  )
  mutation_violations = resource_policy_violations(
    mutation_entries,
    forbidden_digest: snapshot_digest,
    approvals: APPROVED_OVERSIZED_RESOURCES
  )
  assert(
    mutation_violations.fetch(:retired_digest).map { |entry| entry.fetch(:path) }.sort == mutation_paths.sort,
    "retired snapshot digest policy misses renamed hidden or non-resource copies"
  )
  assert(
    mutation_violations.fetch(:oversized).map { |entry| entry.fetch(:path) }.sort == mutation_paths.sort,
    "distributable size policy misses hidden or non-resource copies"
  )
end
assert(
  distributable_files.any? { |path| relative(path).split(File::SEPARATOR).any? { |part| part.start_with?(".") } },
  "shared traversal did not discover any hidden distributable adapter"
)

product_router = File.read(File.join(SKILLS, "fulcrum-product-knowledge", "SKILL.md"))
governance = File.read(
  File.join(SKILLS, "fulcrum-product-knowledge", "resources", "resource-governance.md")
)
required_public_urls = [PUBLIC_OPENAPI, PUBLIC_OPENAPI_DOCS].map { |url| URI.parse(url).normalize }
{ "product router" => product_router, "resource governance" => governance }.each do |source, text|
  public_urls = normalized_public_urls(text, source: source)
  assert(public_urls.include?(required_public_urls[0]), "REST authority lacks the canonical public OpenAPI URL")
  assert(public_urls.include?(required_public_urls[1]), "REST authority lacks the public OpenAPI documentation")
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
  markdown_links(text_by_path.fetch(path)).each do |target|
    local = local_target(path, target)
    next unless local
    resolved, fragment = local

    assert(plugin_path?(resolved), "local link escapes the distributable plugin in #{relative(path)}: #{target}")
    assert(File.exist?(resolved), "dangling local link in #{relative(path)}: #{target}")
    if fragment && File.file?(resolved) && File.extname(resolved).casecmp(".md").zero?
      assert(
        markdown_anchors(text_by_path.fetch(resolved)).include?(fragment),
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
  indexed = markdown_links(text_by_path.fetch(index)).filter_map do |target|
    local_target(index, target)&.first
  end
  FileContracts.files_under(directory).each do |path|
    next if path == index

    assert(indexed.include?(path), "#{relative(path)} is missing from its sibling index")
  end
end

distributable_entries.each do |entry|
  path = entry.fetch(:path)
  text = entry.fetch(:text)
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
    distributable_entries.find { |entry| entry.fetch(:path) == path }.fetch(:sha256) == row.fetch("sha256"),
    "hash-pinned report template changed: #{row.fetch("path")}"
  )
end

puts format(
  "Resource contract test passed: %d files hashed, %d managed files, %d local links, 49+9 example contracts, no file over %d KB",
  distributable_entries.length,
  managed_files.length,
  incoming.length,
  MAX_RESOURCE_BYTES / 1024
)
