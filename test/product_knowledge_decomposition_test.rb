#!/usr/bin/env ruby
# frozen_string_literal: true

require_relative "../scripts/file_contracts"
require "fileutils"
require "tmpdir"

ROOT = File.expand_path("..", __dir__)
SKILLS = File.join(ROOT, "plugins", "fulcrum-ai-toolkit", "skills")

FOCUSED_SKILLS = {
  "fulcrum-integration-patterns" => "resources/integration-selection-reference.md",
  "fulcrum-gis-mapping" => "resources/mapping-capability-reference.md",
  "fulcrum-query-api" => "resources/query-modeling-reference.md",
  "fulcrum-access-management" => "resources/access-control-reference.md",
  "fulcrum-data-migration" => "resources/migration-assessment-reference.md"
}.freeze

def assert(condition, message)
  return if condition

  warn "Product knowledge decomposition test failed: #{message}"
  exit 1
end

def read(relative_path)
  File.read(File.join(ROOT, relative_path))
end

def whitespace_width(text, start_column)
  column = start_column
  index = 0
  while index < text.length
    case text[index]
    when " "
      column += 1
    when "\t"
      column += 4 - (column % 4)
    else
      break
    end
    index += 1
  end
  [index, column - start_column, column]
end

def blank_blockquote_line?(source_line)
  line = source_line
  loop do
    leading_length, leading_width, _leading_column = whitespace_width(line, 0)
    return false if leading_width > 3

    content = line[leading_length..]
    break unless content.start_with?(">")

    line = content[1..]
    line = line[1..] if line.start_with?(" ", "\t")
  end
  line.strip.empty?
end

def fenced_code_block?(text)
  list_indents = []

  text.each_line.any? do |source_line|
    full_indent_length, full_indent_width, _full_indent_column = whitespace_width(source_line, 0)
    continuation_fence = list_indents.any? do |indent|
      full_indent_width >= indent && (full_indent_width - indent) <= 3
    end
    if (full_indent_width <= 3 || continuation_fence) &&
       source_line[full_indent_length..].match?(/\A(?:`{3,}|~{3,})/)
      next true
    end

    line = source_line
    column = 0
    saw_list_marker = false
    loop do
      leading_length, leading_width, after_leading_column = whitespace_width(line, column)
      break if leading_width > 3

      content = line[leading_length..]
      if content.start_with?(">")
        content = content[1..]
        column = after_leading_column + 1
        if content.start_with?(" ")
          content = content[1..]
          column += 1
        elsif content.start_with?("\t")
          content = content[1..]
          column += 4 - (column % 4)
        end
        line = content
        next
      end

      marker = content.match(/\A(?:[-+*]|\d{1,9}[.)])/)
      break unless marker

      after_marker = content[marker[0].length..]
      marker_end_column = after_leading_column + marker[0].length
      padding_length, padding_width, after_padding_column = whitespace_width(
        after_marker,
        marker_end_column
      )
      break unless padding_width.between?(1, 4)

      line = after_marker[padding_length..]
      column = after_padding_column
      list_indents = list_indents.select { |indent| indent <= after_leading_column }
      list_indents << after_padding_column
      saw_list_marker = true
    end

    fence_indent_length, fence_indent_width, fence_start_column = whitespace_width(line, column)
    list_continuation_fence = list_indents.any? do |indent|
      fence_start_column >= indent && (fence_start_column - indent) <= 3
    end
    fenced = (fence_indent_width <= 3 || list_continuation_fence) &&
      line[fence_indent_length..].match?(/\A(?:`{3,}|~{3,})/)

    unless saw_list_marker || source_line.strip.empty? || blank_blockquote_line?(source_line)
      list_indents.pop while list_indents.any? && full_indent_width < list_indents.last
    end
    fenced
  end
end

router = read("plugins/fulcrum-ai-toolkit/skills/fulcrum-product-knowledge/SKILL.md")
coverage = read("plugins/fulcrum-ai-toolkit/docs/legacy-product-knowledge-coverage.md")
readme = read("README.md")
source_index = read("plugins/fulcrum-ai-toolkit/skills/fulcrum-product-knowledge/resources/llms-txt-index.md")

FOCUSED_SKILLS.each do |name, resource|
  skill_path = File.join(SKILLS, name, "SKILL.md")
  resource_path = File.join(SKILLS, name, resource)
  assert(File.file?(skill_path), "#{name} is not packaged")
  assert(File.file?(resource_path), "#{name} resource is missing")

  skill = File.read(skill_path)
  [
    "## When To Use",
    "## When Not To Use",
    "## Source Order",
    "## Workflow",
    "## App MCP",
    "## Confirmation, Privacy, And Failure",
    "## References"
  ].each do |heading|
    assert(skill.include?(heading), "#{name} lacks #{heading}")
  end

  assert(skill.match?(/^description: .*Use /), "#{name} frontmatter lacks model invocation triggers")
  assert(skill.match?(/^> Source: .*https:\/\//), "#{name} lacks a nearby public Source note")
  assert(skill.include?(resource), "#{name} does not link its focused resource")
  assert(router.include?("../#{name}/SKILL.md"), "router does not link #{name}")
  assert(coverage.include?("../skills/#{name}/SKILL.md"), "coverage map does not link #{name}")
  assert(readme.include?("| `#{name}` |"), "README does not inventory #{name}")

  skill_tree_files = FileContracts.files_under(File.join(SKILLS, name))
  fenced_files = skill_tree_files.select { |path| fenced_code_block?(FileContracts.read_text(path)) }
  assert(fenced_files.empty?, "#{name} contains fenced code blocks: #{fenced_files.join(", ")}")
end

[
  "```\nexample\n```",
  "```typescript\nconst value = 1;\n```",
  "```shell\necho example\n```",
  "   ```ruby\nvalue = 1\n   ```",
  "~~~python\nvalue = 1\n~~~",
  "> ```javascript\n> const value = 1;\n> ```",
  "> ~~~typescript\n> const value = 1;\n> ~~~",
  "- \t```ruby\nvalue = 1\n```",
  "-  -   \t```ruby\nvalue = 1\n```",
  "- item\n\n    ```ruby\n    value = 1\n    ```",
  "- outer\n  - inner\n\n    ~~~typescript\n    value = 1\n    ~~~",
  "> -    item\n>      ```ruby\n>      value = 1\n>      ```",
  "> 1.    item\n>\n>       ```ruby\n>       value = 1\n>       ```"
].each do |fixture|
  assert(fenced_code_block?(fixture), "fenced-code detector missed a neutral fixture")
end
assert(
  !fenced_code_block?("    ```literal\n    not a CommonMark fence\n    ```"),
  "fenced-code detector treats a four-space literal as a CommonMark fence"
)
assert(
  !fenced_code_block?("-     ```literal\n"),
  "fenced-code detector consumes invalid list-marker padding"
)
assert(
  !fenced_code_block?("1234567890. ```literal\n"),
  "fenced-code detector accepts an overlong ordered-list marker"
)

Dir.mktmpdir("toolkit-hidden-fences") do |directory|
  hidden_file = File.join(directory, ".private.md")
  hidden_text_file = File.join(directory, ".private.txt")
  hidden_directory_file = File.join(directory, ".private", "notes")
  FileUtils.mkdir_p(File.dirname(hidden_directory_file))
  File.write(hidden_file, "```text\nhidden\n```\n")
  File.write(hidden_text_file, "> ```text\n> hidden\n> ```\n")
  File.write(hidden_directory_file, "~~~text\nhidden\n~~~\n")
  discovered = FileContracts.files_under(directory)
  assert(discovered.include?(hidden_file), "fence traversal omits a hidden file")
  assert(discovered.include?(hidden_text_file), "fence traversal omits a hidden text extension")
  assert(discovered.include?(hidden_directory_file), "fence traversal omits a hidden directory")
  assert(
    discovered.all? { |path| fenced_code_block?(FileContracts.read_text(path)) },
    "fence traversal misses hidden fixture content"
  )
end

%w[fulcrum-workflows fulcrum-ai-capabilities].each do |excluded|
  assert(!File.directory?(File.join(SKILLS, excluded)), "excluded skill #{excluded} was created")
end

[
  "future extraction",
  "Planned `fulcrum-integration-patterns`",
  "Planned `fulcrum-gis-mapping`",
  "Planned `fulcrum-query-api`",
  "Planned `fulcrum-access-management`",
  "Planned `fulcrum-data-migration`",
  "interim summary",
  "interim guidance"
].each do |stale_text|
  assert(!coverage.include?(stale_text), "coverage map retains stale text #{stale_text.inspect}")
end

assert(router.include?("field-choice-optimizer"), "router drops the shared field-choice optimizer handoff")
assert(router.include?("feasibility-check"), "router drops the shared feasibility handoff")
assert(source_index.include?("Every URL below was present in the upstream `llms.txt`"), "source index does not define upstream provenance")
assert(!source_index.include?("help.fulcrumapp.com"), "source index mixes curated Help Center supplements with llms.txt entries")
assert(!source_index.include?("www.fulcrumapp.com/pricing"), "source index mixes pricing supplements with llms.txt entries")
assert(!source_index.include?("raw.githubusercontent.com"), "source index mixes OpenAPI supplements with llms.txt entries")

puts "Product knowledge decomposition test passed: five focused skills are sourced, routed, and packaged"
