#!/usr/bin/env ruby
# frozen_string_literal: true

# Layer 4: externalized examples and assets.
#
# This test proves that no fenced code block survives in distributable skill
# Markdown, that every externalized file is indexed and reachable, that every
# executable file names a public source, and that the legacy example manifest
# accounts for all nine legacy example units.
#
# Exhaustive cross-package App MCP contract parity remains layer 6's job.

require_relative "../scripts/content_contracts"
require_relative "../scripts/file_contracts"
require "fileutils"
require "json"
require "open3"
require "rbconfig"
require "tmpdir"

ROOT = File.expand_path("..", __dir__)
PLUGIN = File.join(ROOT, "plugins", "fulcrum-ai-toolkit")
SKILLS = File.join(PLUGIN, "skills")
EXAMPLE_COVERAGE = File.join(PLUGIN, "docs", "legacy-example-coverage.md")

EXTERNAL_DIRECTORIES = %w[examples assets].freeze
INDEX_BASENAME = "README.md"

# Every legacy example unit recorded in the manifest. Eight are fenced blocks
# in the artifact whose SHA-256 the manifest records; the ninth is the unfenced
# App MCP extension publish sequence.
LEGACY_UNITS = %w[L1 L2 L3 L4 L5 L6 L7 L8 L9].freeze
LEGACY_DISPOSITIONS = %w[externalized rewrite merged drop private stale].freeze
CURRENT_BLOCK_COUNTS = {
  "fulcrum-data-events" => 18,
  "fulcrum-app-extensions" => 10,
  "fulcrum-report-building" => 13,
  "fulcrum-app-design" => 3,
  "fulcrum-app-builder, fulcrum-discovery, fulcrum-workflow-decomposition, fulcrum-solution-document" => 5
}.freeze
CURRENT_DISPOSITION_COUNTS = {
  "externalized" => 37,
  "rewrite" => 9,
  "merged" => 3
}.freeze

SOURCE_COMMENT_PATTERNS = {
  ".js" => %r{^//\s*Source:\s*https://\S+},
  ".html" => %r{^\s*<!--\s*Source:\s*https://\S+},
  ".ejs" => %r{^\s*<%#\s*Source:\s*https://\S+},
  ".css" => %r{^\s*/\*\s*Source:\s*https://\S+}m,
  ".sql" => %r{^--\s*Source:\s*https://\S+},
  ".txt" => %r{^#\s*Source:\s*https://\S+},
  ".md" => %r{<!--\s*Source:\s*https://\S+}
}.freeze

# Strict JSON cannot carry a comment, so its source lives in the sibling index.
COMMENTLESS_EXTENSIONS = %w[.json].freeze

DESTRUCTIVE_SQL = /^\s*(?:INSERT|UPDATE|DELETE|MERGE|TRUNCATE|DROP|ALTER|CREATE|GRANT|REVOKE)\b/i

CREDENTIAL_SHAPES = [
  /\b(?:sk|pk|rk)_(?:live|test)_[A-Za-z0-9]{8,}/,
  /\b(?:api[_-]?key|api[_-]?token|access[_-]?token|client[_-]?secret|password)\b\s*[:=]\s*["'][^"'\s]{12,}["']/i,
  /\bAuthorization\s*:\s*Bearer\s+[A-Za-z0-9._\-]{12,}/i
].freeze

failures = []

def assert(condition, message)
  return if condition

  Kernel.warn "External examples test failed: #{message}"
  exit 1
end

def relative(path)
  path.sub("#{ROOT}/", "")
end

def skill_names
  Dir[File.join(SKILLS, "*", "SKILL.md")].sort.map { |path| File.basename(File.dirname(path)) }
end

def markdown?(path)
  File.extname(path).casecmp(".md").zero?
end

# 1. No fenced code block anywhere under the distributable skills, including
#    hidden and extensionless files. Uses the shared traversal so a hidden file
#    cannot escape the scan.
fenced = FileContracts.files_under(SKILLS).select do |path|
  markdown?(path) && ContentContracts.fence_marker_token?(FileContracts.read_text(path))
end
assert(fenced.empty?, "skill Markdown still contains fence markers: #{fenced.map { |p| relative(p) }.join(", ")}")

hidden_markdown = FileContracts.files_under(SKILLS).select do |path|
  File.basename(path).start_with?(".") && markdown?(path)
end
hidden_markdown.each do |path|
  assert(
    !ContentContracts.fence_marker_token?(FileContracts.read_text(path)),
    "hidden skill Markdown contains fence markers: #{relative(path)}"
  )
end

Dir.mktmpdir("toolkit-external-fences") do |directory|
  hidden_file = File.join(directory, ".hidden", "notes.md")
  FileUtils.mkdir_p(File.dirname(hidden_file))
  File.write(hidden_file, "```text\nhidden\n```\n")
  discovered = FileContracts.files_under(directory)
  assert(discovered.include?(hidden_file), "shared traversal omits a hidden nested Markdown file")
  assert(
    ContentContracts.fence_marker_token?(FileContracts.read_text(hidden_file)),
    "fence detection misses a hidden nested fixture"
  )
end

# 2. Collect every externalized example and asset.
external_files = []
index_files = []
skill_names.each do |skill|
  EXTERNAL_DIRECTORIES.each do |directory|
    root = File.join(SKILLS, skill, directory)
    next unless File.directory?(root)

    entries = FileContracts.files_under(root)
    index = File.join(root, INDEX_BASENAME)
    assert(entries.include?(index), "#{skill}/#{directory} has no #{INDEX_BASENAME} index")
    index_files << index
    external_files.concat(entries - [index])
  end
end
assert(!external_files.empty?, "no externalized examples or assets were found")

# 3. Every example and asset is referenced by name from skill Markdown.
skill_markdown = FileContracts.files_under(SKILLS).select { |path| markdown?(path) }
markdown_corpus = skill_markdown.map { |path| FileContracts.read_text(path) }.join("\n")
external_files.each do |path|
  basename = File.basename(path)
  assert(
    markdown_corpus.include?("](#{basename})") || markdown_corpus.include?("/#{basename})"),
    "externalized file is not linked from any skill Markdown: #{relative(path)}"
  )
end

# 4. Every relative Markdown link under the skills tree, and in the example
#    coverage manifest, resolves.
link_documents = skill_markdown + [EXAMPLE_COVERAGE]
link_documents.each do |path|
  FileContracts.read_text(path).scan(/\]\(([^)\s]+)\)/).flatten.each do |target|
    next if target.start_with?("http://", "https://", "#", "mailto:")

    resolved = File.expand_path(target.split("#").first.to_s, File.dirname(path))
    assert(
      File.exist?(resolved),
      "dangling relative link in #{relative(path)}: #{target}"
    )
  end
end

# 5. Source attribution: a native comment for commentable formats, and a
#    sibling index entry naming a public URL for strict JSON.
external_files.each do |path|
  extension = File.extname(path).downcase
  text = FileContracts.read_text(path)

  if COMMENTLESS_EXTENSIONS.include?(extension)
    index = File.join(File.dirname(path), INDEX_BASENAME)
    index_text = FileContracts.read_text(index)
    entry = index_text.each_line.find { |line| line.include?(File.basename(path)) }
    assert(entry, "strict-format file lacks a sibling index entry: #{relative(path)}")
    assert(
      entry.match?(%r{\]\(https://\S+\)}),
      "strict-format file's index entry lacks a public source URL: #{relative(path)}"
    )
    next
  end

  pattern = SOURCE_COMMENT_PATTERNS[extension]
  assert(pattern, "no source-comment rule for #{relative(path)}")
  assert(
    text.match?(pattern),
    "externalized file lacks a native Source comment with a public URL: #{relative(path)}"
  )
end

# 6. Parse every JSON asset.
external_files.select { |path| File.extname(path).casecmp(".json").zero? }.each do |path|
  JSON.parse(File.read(path))
rescue JSON::ParserError => e
  assert(false, "invalid JSON in #{relative(path)}: #{e.message}")
end

# 7. Syntax-check every JavaScript example with the Node runtime already used
#    in CI. Skipped only when no Node runtime is present.
javascript_files = external_files.select { |path| File.extname(path).casecmp(".js").zero? }
assert(!javascript_files.empty?, "no JavaScript examples were externalized")
node = ENV["NODE"] || "node"
_node_stdout, _node_stderr, node_status = Open3.capture3(node, "--version")
if node_status.success?
  javascript_files.each do |path|
    _stdout, stderr, status = Open3.capture3(node, "--check", path)
    assert(status.success?, "JavaScript syntax error in #{relative(path)}: #{stderr.lines.first(3).join.strip}")
  end
else
  assert(ENV["REQUIRE_NODE"] != "1", "Node runtime is required but unavailable")
  Kernel.warn "External examples test: no Node runtime found; skipped JavaScript syntax checks"
end

# 8. Safety and contract checks. These are simple content assertions, not a
#    parser: exhaustive contract parity is layer 6's job.
external_files.each do |path|
  text = FileContracts.read_text(path)
  CREDENTIAL_SHAPES.each do |shape|
    assert(!text.match?(shape), "possible credential in #{relative(path)}")
  end
  assert(
    !text.include?("github.com/fulcrumapp/app-mcp"),
    "private App MCP repository URL in #{relative(path)}"
  )
  assert(
    !ContentContracts.private_filesystem_path?(text),
    "private filesystem path in #{relative(path)}"
  )
  assert(
    !ContentContracts.private_provenance?(text),
    "private person or customer provenance in #{relative(path)}"
  )
end

# SQL assets are read-only.
sql_files = external_files.select { |path| File.extname(path).casecmp(".sql").zero? }
assert(!sql_files.empty?, "no SQL assets were externalized")
sql_files.each do |path|
  text = FileContracts.read_text(path)
  offending = text.each_line.reject { |line| line.strip.start_with?("--") }.select { |line| line.match?(DESTRUCTIVE_SQL) }
  assert(offending.empty?, "destructive SQL in #{relative(path)}: #{offending.first.to_s.strip}")
  assert(
    text.match?(/no server-side bind parameters|no bind-parameter|exposes no\s+\n?--\s*server-side bind parameters/),
    "SQL asset does not repeat the no-bind guidance: #{relative(path)}"
  )
end

# Data Event examples cover the documented LOADFILE options-object contract and
# keep authorization out of client-side scripts.
data_event_examples = File.join(SKILLS, "fulcrum-data-events", "examples")
loadfile = File.read(File.join(data_event_examples, "loadfile-shared-helpers.js"))
assert(
  loadfile.match?(/LOADFILE\(\{\s*name:\s*'shared-helpers\.js',\s*form_id:\s*FORM\(\)\.id,\s*variable:\s*'sharedHelpers'\s*\},\s*function\s*\(error, data\)/m),
  "LOADFILE example does not use the documented options object and callback"
)
assert(!loadfile.match?(/LOADFILE\(\s*['"]/), "LOADFILE example uses a positional signature")
%w[
  set-field-values-on-status-change.js
  cascading-choices.js
  validate-record-completeness.js
  conditional-visibility-sethidden.js
  loadfile-shared-helpers.js
].each do |name|
  assert(File.file?(File.join(data_event_examples, name)), "Data Events is missing focused example #{name}")
end

# App Extension examples use the object-form bridge contract.
extension_examples = File.join(SKILLS, "fulcrum-app-extensions", "examples")
extension_corpus = FileContracts.files_under(extension_examples).map { |path| FileContracts.read_text(path) }.join("\n")
assert(
  extension_corpus.match?(/OPENEXTENSION\(\{.*url:.*title:.*data:.*onMessage:/m),
  "extension examples lack the object-form OPENEXTENSION contract"
)
assert(
  extension_corpus.include?("attachment://species_picker.html"),
  "extension examples lack the attachment:// Reference File URL form"
)
assert(
  extension_corpus.include?("Fulcrum.load(function (payload)") &&
    extension_corpus.include?("payload.data || {}"),
  "extension examples lack the current Fulcrum.load payload semantics"
)
assert(
  extension_corpus.include?("event.origin"),
  "extension examples lack safe message and origin handling guidance"
)
extension_page = File.read(File.join(extension_examples, "species-picker-extension.html"))
assert(
  extension_page.include?("<script>") && extension_page.include?("Fulcrum.finish("),
  "self-contained extension page lacks its inline script"
)
assert(
  extension_page.include?("window.Fulcrum={") && !extension_page.include?("bootstrap belongs here"),
  "self-contained extension page lacks the public inline bridge bootstrap"
)
assert(
  !extension_corpus.include?("https://fulcrumapp.com/js/fulcrum-extension.js"),
  "extension examples reference a stale hosted bootstrap"
)

# Report examples use documented runtime functions only.
report_examples = File.join(SKILLS, "fulcrum-report-building", "examples")
report_corpus = FileContracts.files_under(report_examples).map { |path| FileContracts.read_text(path) }.join("\n")
assert(
  report_corpus.include?("record.formValues.find('inspector_name')") &&
    report_corpus.include?(".displayValue") &&
    report_corpus.include?(".value") &&
    report_corpus.include?(".items"),
  "report examples do not use documented form-value access"
)
assert(
  report_corpus.include?("API('/choice_lists'") && report_corpus.include?("API('/forms'"),
  "report examples do not use the documented API(path, options) helper"
)
assert(
  report_corpus.include?(".rows.forEach(function (row)"),
  "report examples do not read QUERY results from rows"
)
assert(
  !report_corpus.match?(/record\.(?:getValue|getDisplayValue|getRepeatableValues)\s*\(/),
  "report examples use a nonexistent record helper"
)
assert(
  !report_corpus.match?(/JSONREQUEST\(url\)|RENDER\(elements, callback\)|RENDERVALUES\(callback\)|APIREQUEST/),
  "report examples use an obsolete or invented report runtime signature"
)
assert(
  File.file?(File.join(SKILLS, "fulcrum-report-building", "assets", "report-print-layout.css")),
  "report assets lack a copyable stylesheet"
)

# 9. The legacy example manifest accounts for every legacy unit.
assert(File.file?(EXAMPLE_COVERAGE), "legacy example coverage manifest is missing")
coverage = File.read(EXAMPLE_COVERAGE)
assert(
  coverage.match?(/SHA-256:\s*\n?>?\s*`274e73e1ea09910244821d809fa9b3427240d20b6f3b5133acb7c81b0912a7b5`/),
  "legacy example manifest does not record the artifact SHA-256"
)
assert(
  !coverage.include?("legacy-product-knowledge-SKILL.md"),
  "legacy example manifest leaks the local artifact filename"
)
LEGACY_UNITS.each do |unit|
  row = coverage.each_line.find { |line| line.start_with?("| #{unit} |") }
  assert(row, "legacy example manifest is missing unit #{unit}")
  columns = row.split("|").map(&:strip)
  assert(columns.length >= 8, "legacy unit #{unit} row is missing columns")
  disposition = columns[3].delete("`")
  assert(
    LEGACY_DISPOSITIONS.include?(disposition),
    "legacy unit #{unit} has an unknown disposition #{disposition.inspect}"
  )
  assert(!columns[4].empty?, "legacy unit #{unit} has no canonical target")
  assert(columns[5].match?(%r{https://\S+}), "legacy unit #{unit} has no public source URL")
  assert(!columns[6].empty?, "legacy unit #{unit} has no reason")
end
[504, 533, 563, 625, 826, 868, 882, 906].each do |anchor|
  assert(coverage.include?(anchor.to_s), "legacy example manifest omits fenced-block anchor line #{anchor}")
end

current_section = coverage.split("## Externalized current blocks", 2).last
assert(current_section, "legacy example manifest lacks current-block coverage")
current_rows = current_section.each_line.select do |line|
  line.start_with?("| `") && line.match?(/\| `(?:externalized|rewrite|merged)` \|/)
end
assert(current_rows.length == 49, "current-block manifest has #{current_rows.length} rows instead of 49")

CURRENT_BLOCK_COUNTS.each do |heading, expected|
  section = current_section.split("### #{heading}", 2).last
  assert(section, "current-block manifest lacks #{heading} section")
  section = section.split(/^### /, 2).first
  rows = section.each_line.count do |line|
    line.start_with?("| `") && line.match?(/\| `(?:externalized|rewrite|merged)` \|/)
  end
  assert(rows == expected, "#{heading} manifest has #{rows} rows instead of #{expected}")
end

actual_dispositions = current_rows.each_with_object(Hash.new(0)) do |row, counts|
  disposition = row.split("|").map(&:strip)[3].delete("`")
  counts[disposition] += 1
end
assert(
  actual_dispositions == CURRENT_DISPOSITION_COUNTS,
  "current-block dispositions are #{actual_dispositions.inspect}, expected #{CURRENT_DISPOSITION_COUNTS.inspect}"
)

assert(
  !FileContracts.files_under(SKILLS).any? do |path|
    FileContracts.read_text(path).include?("SETFORMATTRIBUTES({ hidden:")
  end,
  "unsupported SETFORMATTRIBUTES hidden-map example remains"
)

query_corpus = FileContracts.files_under(File.join(SKILLS, "fulcrum-query-api", "assets"))
  .map { |path| FileContracts.read_text(path) }
  .join("\n")
assert(
  query_corpus.include?("_parent_id") &&
    query_corpus.include?("_created_by_id") &&
    query_corpus.include?("_updated_by_id") &&
    query_corpus.include?("_assigned_to_id"),
  "Query API examples omit current repeatable or metadata columns"
)
assert(
  !query_corpus.match?(/\bfulcrum_(?:parent|record)_id\b|_(?:created_by|updated_by|assigned_to)\b(?!_id)/),
  "Query API examples use obsolete column names"
)

build_sequence = File.read(
  File.join(SKILLS, "fulcrum-app-builder", "assets", "app-build-sequence.txt")
)
validate_position = build_sequence.index("fulcrum_forms_validate")
create_position = build_sequence.index("fulcrum_forms_create")
assert(
  validate_position && create_position && validate_position < create_position,
  "new-form example does not validate before create"
)

# 10. Package boundaries this layer must not move.
assert(
  skill_names.length == 16,
  "skill inventory changed: #{skill_names.length} skills"
)
%w[
  fulcrum-integration-patterns
  fulcrum-gis-mapping
  fulcrum-query-api
  fulcrum-access-management
  fulcrum-data-migration
].each do |focused|
  assert(File.file?(File.join(SKILLS, focused, "SKILL.md")), "focused skill #{focused} was removed")
end
openapi = File.join(SKILLS, "fulcrum-product-knowledge", "resources", "fulcrum-rest-api.json")
assert(File.file?(openapi), "vendored OpenAPI resource was retired")

puts format(
  "External examples test passed: %d externalized files across %d indexes, 0 skill Markdown fences, %d legacy units",
  external_files.length,
  index_files.length,
  LEGACY_UNITS.length
)
