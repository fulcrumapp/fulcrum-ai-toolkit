#!/usr/bin/env ruby
# frozen_string_literal: true

# Layer 4: externalized examples and assets.
#
# This test proves that no fenced code block survives in distributable skill
# Markdown, that every externalized file is indexed and reachable, that every
# executable file names a public source, that every distributable example,
# asset, and index is free of credential or private material, and that the
# legacy and current example inventories are exact.
#
# Everything that needs a parser — HTML, inline scripts and styles, EJS, CSS,
# JSON, JavaScript, the read-only SQL contract, and the structural validity of
# what a report template renders — belongs to tools/format-validator, which uses
# established parsers pinned in its lockfile and proves its own contracts
# against bypass fixtures. This file invokes it and requires its evidence rather
# than carrying a second implementation of the same rules.
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
BLOCK_INVENTORY = File.join(ROOT, "test", "data", "example-block-inventory.json")
FORMAT_VALIDATOR = File.join(ROOT, "tools", "format-validator")
OPENAPI = File.join(SKILLS, "fulcrum-product-knowledge", "resources", "fulcrum-rest-api.json")

EXTERNAL_DIRECTORIES = %w[examples assets].freeze
INDEX_BASENAME = "README.md"

# Every legacy example unit recorded in the manifest. Eight are fenced blocks
# in the artifact whose SHA-256 the manifest records; the ninth is the unfenced
# App MCP extension publish sequence.
LEGACY_UNITS = %w[L1 L2 L3 L4 L5 L6 L7 L8 L9].freeze
LEGACY_DISPOSITIONS = %w[externalized rewrite merged drop private stale].freeze
CURRENT_BLOCK_TOTAL = 49
CURRENT_DISPOSITION_COUNTS = {
  "externalized" => 31,
  "rewrite" => 15,
  "merged" => 3
}.freeze

# Every Source comment names its public documentation. The capture is the URL,
# which is then held to the shared public-URL contract, so an internal or
# loopback host cannot pass as a source.
SOURCE_COMMENT_PATTERNS = {
  ".js" => %r{^//\s*Source:\s*(\S+)},
  ".html" => %r{^\s*<!--\s*Source:\s*(\S+)},
  ".ejs" => %r{^\s*<%#\s*Source:\s*(\S+)},
  ".css" => %r{^\s*/\*\s*Source:\s*(\S+)},
  ".sql" => %r{^--\s*Source:\s*(\S+)},
  ".txt" => %r{^#\s*Source:\s*(\S+)},
  ".md" => %r{<!--\s*Source:\s*(\S+)}
}.freeze

# Strict JSON cannot carry a comment, so its source lives in the sibling index.
COMMENTLESS_EXTENSIONS = %w[.json].freeze

# The evidence tools/format-validator must report back, so delegating the
# parsing work cannot quietly become skipping it.
#
#   contract-fixture  bypass fixtures the SQL, QUERY(), interpolation, markup,
#                     and branch-coverage contracts prove themselves against
#   embedded-sql      QUERY() statements read out of a report template's syntax
#                     tree
#   rendered-html     report templates rendered with fixture data and validated
#                     as markup
#   branch-covered    report templates whose fixtures were measured to reach
#                     every branch, which is what makes rendering proof rather
#                     than a sample
#
# The first two are floors, so adding an example does not fail this layer. The
# last two are counted against the report templates this layer already found,
# so a template that is never rendered — or rendered without reaching all of
# its markup — is missing evidence rather than merely below a round number.
MINIMUM_CONTRACT_FIXTURES = 60
MINIMUM_EMBEDDED_SQL = 5

# The single Reference File name the publish sequence uploads and every trigger
# opens. There is exactly one spelling of it in the repository.
EXTENSION_ATTACHMENT_FILE = "species-picker.html"
EXTENSION_ATTACHMENT_URL = "attachment://#{EXTENSION_ATTACHMENT_FILE}"
# The two generic placeholders that documentation uses to describe the URL
# shape itself, alongside the one concrete file this package ships.
ALLOWED_ATTACHMENT_URLS = [
  "attachment://filename.html",
  "attachment://my-extension.html",
  EXTENSION_ATTACHMENT_URL
].sort.freeze

CREDENTIAL_SHAPES = [
  /\b(?:sk|pk|rk)_(?:live|test)_[A-Za-z0-9]{8,}/,
  /\b(?:api[_-]?key|api[_-]?token|access[_-]?token|client[_-]?secret|password)\b\s*[:=]\s*["'][^"'\s]{12,}["']/i,
  /\bAuthorization\s*:\s*Bearer\s+[A-Za-z0-9._\-]{12,}/i
].freeze

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

# Returns the Source URLs a file fails on, or [] when every Source comment
# names a public URL.
def source_url_violations(text, pattern)
  urls = text.scan(pattern).flatten
  return ["no Source comment"] if urls.empty?

  urls.reject { |url| ContentContracts.public_url?(url) }
end

def credential_shapes(text)
  CREDENTIAL_SHAPES.select { |shape| text.match?(shape) }
end

def manifest_link_targets(cell)
  cell.to_s.scan(/\]\(([^)\s]+)\)/).flatten
end

def plugin_relative(target)
  File.expand_path(target, File.join(PLUGIN, "docs")).sub("#{PLUGIN}/", "")
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

# 5. Source attribution: a native comment naming a public URL for commentable
#    formats, and a sibling index entry naming a public URL for strict JSON.
external_files.each do |path|
  extension = File.extname(path).downcase
  text = FileContracts.read_text(path)

  if COMMENTLESS_EXTENSIONS.include?(extension)
    index = File.join(File.dirname(path), INDEX_BASENAME)
    index_text = FileContracts.read_text(index)
    entry = index_text.each_line.find { |line| line.include?(File.basename(path)) }
    assert(entry, "strict-format file lacks a sibling index entry: #{relative(path)}")
    entry_urls = entry.scan(%r{\]\((https?://[^)\s]+)\)}).flatten
    assert(
      !entry_urls.empty? && entry_urls.all? { |url| ContentContracts.public_url?(url) },
      "strict-format file's index entry lacks a public source URL: #{relative(path)}"
    )
    next
  end

  pattern = SOURCE_COMMENT_PATTERNS[extension]
  assert(pattern, "no source-comment rule for #{relative(path)}")
  violations = source_url_violations(text, pattern)
  assert(
    violations.empty?,
    "externalized file lacks a native Source comment with a public URL: #{relative(path)} (#{violations.join(", ")})"
  )
end

[
  ["// Source: https://docs.fulcrumapp.com/docs/data-events-reference\n", true],
  ["// Source: https://wiki.internal/runbook\n", false],
  ["// Source: https://build-box.local/notes\n", false],
  ["// Source: http://localhost/source\n", false],
  ["// Source: file:///home/example/notes\n", false],
  ["var handled = true;\n", false]
].each do |fixture, expected_public|
  assert(
    source_url_violations(fixture, SOURCE_COMMENT_PATTERNS[".js"]).empty? == expected_public,
    "Source URL contract misjudges fixture #{fixture.strip.inspect}"
  )
end

# 6. Safety and privacy. Indexes are distributable too, so they are scanned
#    alongside the examples and assets they describe.
distributable = (external_files + index_files).uniq
distributable.each do |path|
  text = FileContracts.read_text(path)
  assert(credential_shapes(text).empty?, "possible credential in #{relative(path)}")
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
assert(!index_files.empty?, "no indexes were scanned for credential or private material")

[
  %(| [`x.json`](x.json) | Uses api_token: "abcd1234efgh5678" | [Docs](https://docs.example.com/x) |),
  %(| [`y.json`](y.json) | Authorization: Bearer abcd1234efgh5678 | [Docs](https://docs.example.com/y) |),
  %(| [`z.json`](z.json) | Key sk_live_abcd1234efgh | [Docs](https://docs.example.com/z) |)
].each do |fixture|
  assert(
    !credential_shapes(fixture).empty?,
    "credential scan misses an index-entry fixture: #{fixture}"
  )
end
assert(
  credential_shapes(%(| [`ok.json`](ok.json) | A neutral element | [Docs](https://docs.example.com/ok) |)).empty?,
  "credential scan flags a neutral index entry"
)
assert(
  ContentContracts.private_filesystem_path?(
    %(| [`n.json`](n.json) | Copied from /home/example/notes | [Docs](https://docs.example.com/n) |)
  ),
  "private-path scan misses an index-entry fixture"
)

# 7. SQL policy this layer still owns: every SQL asset repeats the no-bind
#    guidance. Proving the SQL is read-only needs a PostgreSQL parser, and the
#    repository has exactly one — tools/format-validator, invoked below — so
#    this layer states the policy and that tool decides it.
sql_files = external_files.select { |path| File.extname(path).casecmp(".sql").zero? }
assert(!sql_files.empty?, "no SQL assets were externalized")
sql_files.each do |path|
  text = FileContracts.read_text(path)
  assert(
    text.match?(/no server-side bind parameters|no bind-parameter|exposes no\s+\n?--\s*server-side bind parameters/),
    "SQL asset does not repeat the no-bind guidance: #{relative(path)}"
  )
end

# 8. Structural, SQL, and rendered-markup validation run in
#    tools/format-validator, whose parsers are pinned by its lockfile. Its
#    contracts prove themselves against bypass fixtures on every run, and this
#    layer requires that proof rather than repeating it in a second SQL
#    implementation.
ejs_files = external_files.select { |path| File.extname(path).casecmp(".ejs").zero? }
assert(!ejs_files.empty?, "no report templates were externalized")
node = ENV["NODE"] || "node"
node_available =
  begin
    Open3.capture3(node, "--version").last.success?
  rescue Errno::ENOENT, Errno::EACCES
    false
  end
dependencies_installed = File.directory?(File.join(FORMAT_VALIDATOR, "node_modules"))
if node_available && dependencies_installed
  stdout, stderr, status = Open3.capture3(node, "validate-formats.mjs", chdir: FORMAT_VALIDATOR)
  assert(status.success?, "format validation failed:\n#{stderr.empty? ? stdout : stderr}")
  assert(
    stdout.include?("Format validation passed"),
    "format validator did not report a pass: #{stdout.strip}"
  )
  # The counts below are the evidence that the work this layer delegated was
  # actually done: the bypass fixtures ran, every QUERY() statement was read out
  # of a syntax tree, and every report template was rendered, checked, and
  # measured to have had all of its branches reached.
  {
    "contract-fixture" => MINIMUM_CONTRACT_FIXTURES,
    "embedded-sql" => MINIMUM_EMBEDDED_SQL,
    "rendered-html" => ejs_files.length,
    "branch-covered" => ejs_files.length,
    "sql" => sql_files.length
  }.each do |kind, minimum|
    reported = stdout[/\b#{Regexp.escape(kind)}=(\d+)/, 1]
    assert(reported, "format validator did not report a #{kind} count: #{stdout.strip}")
    assert(
      Integer(reported) >= minimum,
      "format validator reported #{kind}=#{reported}, fewer than the #{minimum} this layer requires"
    )
  end
else
  assert(
    ENV["REQUIRE_NODE"] != "1",
    "external format validation is required but the Node runtime or its pinned dependencies are unavailable " \
      "(run `npm ci` in tools/format-validator)"
  )
  Kernel.warn "External examples test: no Node runtime or pinned dependencies; skipped structural format validation"
end

# The RecordLinkField asset is held to the vendored public Forms schema, so an
# invented property or a missing required property fails here, not at the API.
record_link = File.join(SKILLS, "fulcrum-app-design", "assets", "record-link-field.json")
assert(File.file?(record_link), "RecordLinkField asset is missing")
element = JSON.parse(File.read(record_link))
schemas = JSON.parse(File.read(OPENAPI)).dig("components", "schemas")
base_schema = schemas.fetch("FormBaseElement")
record_link_schema = schemas.fetch("FormRecordLinkFieldElement").fetch("allOf").last
allowed_properties = base_schema.fetch("properties").keys | record_link_schema.fetch("properties").keys
unknown_properties = element.keys - allowed_properties
assert(
  unknown_properties.empty?,
  "RecordLinkField asset uses properties the public Forms schema does not define: #{unknown_properties.join(", ")}"
)
missing_required = base_schema.fetch("required") - element.keys
assert(
  missing_required.empty?,
  "RecordLinkField asset omits required element properties: #{missing_required.join(", ")}"
)
assert(
  element["type"] == "RecordLinkField" &&
    base_schema.dig("properties", "type", "enum").include?(element["type"]),
  "RecordLinkField asset does not declare the RecordLinkField type"
)
%w[required disabled hidden].each do |flag|
  assert([true, false].include?(element[flag]), "RecordLinkField asset must set #{flag} as an explicit boolean")
end
record_link_schema.fetch("properties").each do |name, definition|
  next unless element.key?(name) && definition["type"] == "boolean"

  assert([true, false].include?(element[name]), "RecordLinkField asset property #{name} must be a boolean")
end
assert(
  element["key"].to_s.match?(/\A[0-9a-f]{4}\z/),
  "RecordLinkField asset key must be a four-character hex element key"
)
assert(
  element["data_name"].to_s.match?(/\A[a-z][a-z0-9_]*\z/),
  "RecordLinkField asset data_name must be snake case"
)
assert(
  element["linked_form_id"].is_a?(String) && !element["linked_form_id"].empty?,
  "RecordLinkField asset must set linked_form_id"
)
assert(
  element["allow_existing_records"] || element["allow_creating_records"],
  "RecordLinkField asset must allow existing or created records"
)

# The field-type reference teaches the same schema in prose. Every property
# name it tabulates must exist in the vendored public schema, so an invented
# property cannot survive in the reference after being removed from the asset.
field_reference = File.read(
  File.join(SKILLS, "fulcrum-app-design", "resources", "field-type-reference.md")
)
schema_properties = lambda do |name|
  schema = schemas[name]
  next nil unless schema

  (schema["allOf"] ? schema["allOf"].last["properties"] : schema["properties"]).keys
end
universal_properties = schema_properties.call("FormBaseElement")
# Headings whose properties are not those of a Form<Heading>Element.
REFERENCE_SCHEMA_OVERRIDES = {
  "Universal Properties (All Field Types)" => %w[FormBaseElement],
  "StatusField" => %w[FormBody FormStatusField],
  "Repeatable" => %w[FormRepeatableElement]
}.freeze
field_reference.split(/^## /).drop(1).each do |section|
  heading = section.lines.first.strip
  documented = section.scan(/^\| ([a-z_]+(?:\.[a-z_]+)?) \| /).flatten.uniq
  next if documented.empty?

  schema_names = REFERENCE_SCHEMA_OVERRIDES.fetch(heading, ["Form#{heading}Element"])
  known = schema_names.filter_map { |name| schema_properties.call(name) }.flatten
  assert(!known.empty?, "field-type reference section #{heading} has no matching public schema")
  known |= universal_properties unless REFERENCE_SCHEMA_OVERRIDES.key?(heading)
  # A dotted row documents a nested key of a property named on its own row.
  unknown = documented.reject { |name| known.include?(name.split(".").first) }
  assert(
    unknown.empty?,
    "field-type reference section #{heading} documents properties the public Forms schema does not define: #{unknown.join(", ")}"
  )
end

# 9. Data Event examples use the documented LOADFILE options object, keep
#    authorization out of client-side scripts, initialize the rules a change
#    handler alone would leave unapplied, and scope device-wide storage to one
#    record's editing session.
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

{
  "conditional-visibility-sethidden.js" => "applyPermitVisibility",
  "cascading-choices.js" => "applyCountyChoices"
}.each do |name, initializer|
  text = File.read(File.join(data_event_examples, name))
  assert(
    text.match?(/^function #{initializer}\(\) \{/),
    "#{name} does not define the idempotent #{initializer}() function"
  )
  %w[new-record edit-record].each do |event|
    assert(
      text.match?(/ON\('#{event}', function \(event\) \{\s*#{initializer}\(\);/m),
      "#{name} does not apply #{initializer}() on the documented #{event} lifecycle event"
    )
  end
  assert(
    text.match?(/ON\('change', '[a-z_]+', function \(event\) \{\s*#{initializer}\(\);/m),
    "#{name} does not apply #{initializer}() on change"
  )
end

storage_example = File.read(File.join(data_event_examples, "storage-session-state.js"))
assert(
  storage_example.include?("BASELINE_KEY_PREFIX + FORM().id") &&
    storage_example.include?("formScope() + ':record:' + recordId") &&
    storage_example.include?("formScope() + ':draft:' + sessionNonce()"),
  "storage example does not scope its key to the app and to the record or editing session"
)
assert(
  storage_example.include?("function sessionNonce()") &&
    storage_example.include?("Math.random().toString(36)"),
  "storage example does not give an unsaved record a per-session nonce"
)
assert(
  !storage_example.include?("'new-record'"),
  "storage example still gives every unsaved record the same shared key"
)
assert(
  storage_example.include?("function discardAbandonedDraft()") &&
    storage_example.match?(/ON\('load-record', function \(event\) \{\s*discardAbandonedDraft\(\);/m),
  "storage example does not reclaim the key a crashed session abandoned"
)
assert(
  !storage_example.match?(/(?:getItem|setItem|removeItem)\('baseline'\)/),
  "storage example still uses a global persistent key"
)
%w[cancel-record unload-record].each do |event|
  assert(
    storage_example.match?(/ON\('#{event}', function \(event\) \{\s*clearBaseline\(\);/m),
    "storage example does not clear its key on the documented #{event} lifecycle exit"
  )
end
assert(
  storage_example.include?("https://docs.fulcrumapp.com/docs/data-events-storage") &&
    storage_example.include?("https://docs.fulcrumapp.com/docs/data-events-reference") &&
    storage_example.include?("https://docs.fulcrumapp.com/docs/data-events-loadrecords") &&
    storage_example.include?("https://docs.fulcrumapp.com/docs/app-extensions-introduction"),
  "storage example does not source its storage, lifecycle, FORM(), and RECORDID() behavior"
)

# Every runtime function the Data Event examples call is in the portable
# runtime reference, so an example cannot depend on a function this package
# never documents.
runtime_reference = File.read(
  File.join(SKILLS, "fulcrum-data-events", "resources", "data-events-runtime-api.md")
)
%w[FORM RECORDID STORAGE].each do |function|
  assert(
    runtime_reference.include?("| #{function}()"),
    "the Data Events runtime reference does not document #{function}()"
  )
end

# 10. App Extension examples use the object-form bridge contract and exactly one
#     spelling of the Reference File name.
extension_examples = File.join(SKILLS, "fulcrum-app-extensions", "examples")
extension_corpus = FileContracts.files_under(File.join(SKILLS, "fulcrum-app-extensions"))
  .map { |path| FileContracts.read_text(path) }
  .join("\n")
assert(
  extension_corpus.match?(/OPENEXTENSION\(\{.*url:.*title:.*data:.*onMessage:/m),
  "extension examples lack the object-form OPENEXTENSION contract"
)
assert(
  extension_corpus.include?(EXTENSION_ATTACHMENT_URL),
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

publish_sequence = File.read(
  File.join(SKILLS, "fulcrum-app-extensions", "assets", "app-mcp-extension-publish-sequence.txt")
)
assert(
  publish_sequence.include?(%(file_name="#{EXTENSION_ATTACHMENT_FILE}")),
  "publish sequence does not upload #{EXTENSION_ATTACHMENT_FILE}"
)
assert(
  File.file?(File.join(extension_examples, EXTENSION_ATTACHMENT_FILE)),
  "the extension page is not named #{EXTENSION_ATTACHMENT_FILE}"
)
attachment_urls = FileContracts.files_under(SKILLS)
  .flat_map { |path| FileContracts.read_text(path).scan(%r{attachment://[A-Za-z0-9_-]+\.html}) }
  .uniq
  .sort
assert(
  attachment_urls == ALLOWED_ATTACHMENT_URLS,
  "attachment:// URLs are not exactly #{ALLOWED_ATTACHMENT_URLS.join(", ")}: #{attachment_urls.join(", ")}"
)
excluded_roots = [File.join(ROOT, ".git"), File.join(FORMAT_VALIDATOR, "node_modules")]
picker_file_names = FileContracts.files_under(ROOT)
  .reject { |path| excluded_roots.any? { |root| path.start_with?("#{root}/") } }
  .flat_map { |path| FileContracts.read_text(path).scan(/species[_-][a-z_-]*\.html/) }
  .uniq
  .sort
assert(
  picker_file_names == [EXTENSION_ATTACHMENT_FILE],
  "more than one picker file name is in use: #{picker_file_names.join(", ")}"
)

extension_page = File.read(File.join(extension_examples, EXTENSION_ATTACHMENT_FILE))
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

# 11. Report examples use documented runtime functions only, and the date-range
#     example parses real calendar days over a half-open interval.
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

date_range = File.read(File.join(report_examples, "params-date-range.ejs"))
assert(
  date_range.include?("function parseIsoDay(value)") &&
    date_range.include?("parsed.toISOString().slice(0, 10) === text"),
  "date-range example does not round-trip each parameter through a real calendar day"
)
assert(
  date_range.include?("startDay.getTime() > endDay.getTime()") && date_range.include?("rangeError"),
  "date-range example does not reject a reversed range"
)
assert(
  date_range.include?("year < 1 || year > 9998") &&
    date_range.include?("const endExclusiveDay") &&
    date_range.include?("parseIsoDay(isoDay(addDays(endDay || today, -DEFAULT_WINDOW_DAYS)))"),
  "date-range example does not bound years before computing the exclusive end"
)
assert(
  date_range.scan("QUERY(").length == 1,
  "date-range example does not issue exactly one QUERY() call"
)
assert(
  date_range.include?("addDays(endDay, 1)") &&
    date_range.include?("_created_at >= '${String(startDate)") &&
    date_range.include?("_created_at < '${String(endExclusiveDate)"),
  "date-range example does not query a half-open interval"
)
assert(
  !date_range.include?("${requested") && !date_range.include?("${$params"),
  "date-range example interpolates a raw request parameter"
)
assert(
  date_range.include?("<tbody>") &&
    date_range.include?("recordResults.rows.length === 0") &&
    date_range.include?("class=\"report-error\""),
  "date-range example does not wrap its rows in a table with empty and error markup"
)
# BETWEEN is inclusive of its upper bound, so it must not reach a timestamp
# column. Naming it in prose that explains why is fine; surviving into a
# statement is not, and tools/format-validator decides that on the parsed tree
# rather than on this file's text.

# 12. The legacy example manifest accounts for every legacy unit, and the
#     current-block manifest is exact. Identifiers, source documents, ordinals,
#     and targets all match the independent inventory, so a dropped, added,
#     renumbered, or duplicated row fails.
assert(File.file?(EXAMPLE_COVERAGE), "legacy example coverage manifest is missing")
assert(File.file?(BLOCK_INVENTORY), "independent example block inventory is missing")
coverage = File.read(EXAMPLE_COVERAGE)
inventory = JSON.parse(File.read(BLOCK_INVENTORY))
assert(
  coverage.match?(/SHA-256:\s*\n?>?\s*`274e73e1ea09910244821d809fa9b3427240d20b6f3b5133acb7c81b0912a7b5`/),
  "legacy example manifest does not record the artifact SHA-256"
)
assert(
  !coverage.include?("legacy-product-knowledge-SKILL.md"),
  "legacy example manifest leaks the local artifact filename"
)

legacy_section = coverage.split("## Legacy example units", 2).last.split("## Externalized current blocks", 2).first
actual_legacy = legacy_section.each_line.select { |line| line.match?(/\A\| L\d+ \|/) }.map do |row|
  columns = row.split("|").map(&:strip)
  assert(columns.length >= 8, "legacy unit row is missing columns: #{row.strip}")
  disposition = columns[3].delete("`")
  assert(
    LEGACY_DISPOSITIONS.include?(disposition),
    "legacy unit #{columns[1]} has an unknown disposition #{disposition.inspect}"
  )
  assert(!columns[4].empty?, "legacy unit #{columns[1]} has no canonical target")
  assert(columns[5].match?(%r{https://\S+}), "legacy unit #{columns[1]} has no public source URL")
  assert(!columns[6].empty?, "legacy unit #{columns[1]} has no reason")
  {
    "id" => columns[1],
    "disposition" => disposition,
    "targets" => manifest_link_targets(columns[4]).map { |target| plugin_relative(target) }
  }
end
assert(
  actual_legacy.map { |row| row["id"] } == LEGACY_UNITS,
  "legacy units are not exactly #{LEGACY_UNITS.join(", ")}: #{actual_legacy.map { |row| row["id"] }.join(", ")}"
)
assert(
  actual_legacy == inventory.fetch("legacy_units"),
  "legacy manifest does not match the independent inventory"
)

[504, 533, 563, 625, 826, 868, 882, 906].each do |anchor|
  assert(coverage.include?(anchor.to_s), "legacy example manifest omits fenced-block anchor line #{anchor}")
end

current_section = coverage.split("## Externalized current blocks", 2).last
assert(current_section, "legacy example manifest lacks current-block coverage")
current_rows = current_section.each_line.select { |line| line.match?(/\A\| C\d{2} \|/) }
assert(
  current_rows.length == CURRENT_BLOCK_TOTAL,
  "current-block manifest has #{current_rows.length} rows instead of #{CURRENT_BLOCK_TOTAL}"
)

actual_current = current_rows.map do |row|
  columns = row.split("|").map(&:strip)
  assert(columns.length >= 8, "current block row is missing columns: #{row.strip}")
  disposition = columns[5].delete("`")
  assert(
    CURRENT_DISPOSITION_COUNTS.key?(disposition),
    "current block #{columns[1]} has an unknown disposition #{disposition.inspect}"
  )
  assert(!columns[4].empty?, "current block #{columns[1]} has no purpose")
  targets = manifest_link_targets(columns[6])
  assert(targets.length == 1, "current block #{columns[1]} must name exactly one canonical target")
  {
    "id" => columns[1],
    "source" => columns[2].delete("`"),
    "ordinal" => Integer(columns[3]),
    "target" => plugin_relative(targets.first)
  }
end

duplicate_ids = actual_current.map { |row| row["id"] }.tally.select { |_, total| total > 1 }.keys
assert(duplicate_ids.empty?, "current-block identifiers repeat: #{duplicate_ids.join(", ")}")
duplicate_positions = actual_current
  .map { |row| [row["source"], row["ordinal"]] }
  .tally
  .select { |_, total| total > 1 }
  .keys
assert(
  duplicate_positions.empty?,
  "current-block source and ordinal pairs repeat: #{duplicate_positions.map { |source, ordinal| "#{source}##{ordinal}" }.join(", ")}"
)
assert(
  actual_current.map { |row| row["id"] } == (1..CURRENT_BLOCK_TOTAL).map { |number| format("C%02d", number) },
  "current-block identifiers are not C01 through C#{CURRENT_BLOCK_TOTAL} in order"
)
actual_current.group_by { |row| row["source"] }.each do |source, rows|
  ordinals = rows.map { |row| row["ordinal"] }.sort
  assert(
    ordinals == (1..rows.length).to_a,
    "block ordinals for #{source} are #{ordinals.inspect} rather than 1..#{rows.length}"
  )
end
assert(
  actual_current == inventory.fetch("current_blocks"),
  "current-block manifest does not match the independent inventory"
)
(actual_current.map { |row| row["target"] } + inventory.fetch("legacy_units").flat_map { |row| row["targets"] })
  .uniq
  .each { |target| assert(File.exist?(File.join(PLUGIN, target)), "inventory target does not exist: #{target}") }

current_section.scan(/^### (.+?) — (\d+) blocks$/).each do |heading, declared|
  section = current_section.split("### #{heading} — #{declared} blocks", 2).last.split(/^### /, 2).first
  rows = section.each_line.count { |line| line.match?(/\A\| C\d{2} \|/) }
  assert(rows == Integer(declared), "#{heading} manifest has #{rows} rows instead of #{declared}")
end

actual_dispositions = current_rows.each_with_object(Hash.new(0)) do |row, counts|
  counts[row.split("|").map(&:strip)[5].delete("`")] += 1
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

# 13. Package boundaries this layer must not move.
assert(skill_names.length == 16, "skill inventory changed: #{skill_names.length} skills")
%w[
  fulcrum-integration-patterns
  fulcrum-gis-mapping
  fulcrum-query-api
  fulcrum-access-management
  fulcrum-data-migration
].each do |focused|
  assert(File.file?(File.join(SKILLS, focused, "SKILL.md")), "focused skill #{focused} was removed")
end
assert(File.file?(OPENAPI), "vendored OpenAPI resource was retired")

puts format(
  "External examples test passed: %d externalized files across %d indexes, 0 skill Markdown fences, %d legacy units, %d current blocks",
  external_files.length,
  index_files.length,
  LEGACY_UNITS.length,
  CURRENT_BLOCK_TOTAL
)
