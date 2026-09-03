# frozen_string_literal: true

# SqlContracts enforces one narrow contract on the SQL this repository ships:
# every effective statement in a distributable SQL asset must be read-only.
#
# This is deliberately not a SQL parser and must not grow into one. It is a
# lexer with five states — code, line comment, block comment, quoted string,
# quoted identifier — plus a statement splitter, and a two-rule contract
# applied to every statement the splitter produces:
#
#   1. The statement's first word token is in READ_ONLY_LEADING_KEYWORDS.
#   2. No word token anywhere in the statement is in WRITING_KEYWORDS.
#
# Both rules read code-state tokens only, so a keyword inside a comment, a
# string literal, or a quoted identifier is inert, while a keyword hidden after
# a semicolon, behind a comment prefix, or inside a CTE is not. The lexer fails
# closed: an unterminated string, comment, or dollar quote is itself a
# violation, because a statement it cannot delimit is a statement it cannot
# prove read-only.
module SqlContracts
  Violation = Struct.new(:ordinal, :reason, :statement, keyword_init: true) do
    def to_s
      excerpt = statement.to_s.strip.gsub(/\s+/, " ")
      excerpt = "#{excerpt[0, 77]}..." if excerpt.length > 80
      "statement #{ordinal}: #{reason}#{excerpt.empty? ? "" : " (#{excerpt})"}"
    end
  end

  READ_ONLY_LEADING_KEYWORDS = %w[SELECT WITH VALUES TABLE].freeze
  WRITING_KEYWORDS = %w[
    ALTER ATTACH CALL CLUSTER COMMENT COPY CREATE DEALLOCATE DELETE DETACH DO
    DROP EXEC EXECUTE GRANT IMPORT INSERT LISTEN LOCK MERGE MOVE NOTIFY
    PREPARE REASSIGN REFRESH REINDEX RENAME REPLACE RESET REVOKE SECURITY SET
    TRUNCATE UNLISTEN UPDATE UPSERT VACUUM
  ].freeze
  WRITING_FUNCTIONS = %w[
    lo_import lo_unlink nextval pg_advisory_lock pg_advisory_lock_shared
    pg_advisory_xact_lock pg_advisory_xact_lock_shared pg_notify
    pg_reload_conf pg_rotate_logfile pg_switch_wal pg_terminate_backend
    set_config setval
  ].freeze

  # A run of characters the lexer replaces with one space: string literals,
  # quoted identifiers, dollar-quoted bodies, and comments are all opaque.
  OPAQUE = " "
  WORD_TOKEN = /[A-Za-z_][A-Za-z0-9_$]*/.freeze

  module_function

  # Returns [] when every effective statement satisfies the contract.
  def violations(sql)
    statements = effective_statements(sql)
    return [Violation.new(ordinal: 1, reason: statements.fetch(:error), statement: "")] if statements.is_a?(Hash)

    statements.each_with_index.filter_map do |statement, offset|
      reason = statement_violation(statement)
      Violation.new(ordinal: offset + 1, reason: reason, statement: statement) if reason
    end
  end

  def statement_violation(statement)
    tokens = statement.scan(WORD_TOKEN).map(&:upcase)
    return nil if tokens.empty?

    writing = tokens.find { |token| WRITING_KEYWORDS.include?(token) }
    return "writes with #{writing}" if writing

    writing_function = WRITING_FUNCTIONS.find do |function|
      statement.match?(/(?:\b#{Regexp.escape(function)}|__quoted_#{Regexp.escape(function)}__)\s*\(/i)
    end
    return "calls state-changing function #{writing_function}" if writing_function

    leading = tokens.first
    return nil if READ_ONLY_LEADING_KEYWORDS.include?(leading)

    "does not begin with #{READ_ONLY_LEADING_KEYWORDS.join(", ")} (begins with #{leading})"
  end

  # Splits on top-level semicolons after replacing every comment, string, and
  # quoted identifier with an opaque space. Returns { error: reason } when the
  # text cannot be delimited.
  def effective_statements(sql)
    text = sql.to_s
    statements = []
    current = +""
    index = 0

    while index < text.length
      pair = text[index, 2]

      if pair == "--"
        index = skip_line_comment(text, index)
        current << OPAQUE
      elsif pair == "/*"
        index = skip_block_comment(text, index)
        return { error: "unterminated block comment" } unless index
        current << OPAQUE
      elsif text[index] == "'" || text[index] == '"'
        quote = text[index]
        quoted = consume_quoted(text, index, quote)
        return { error: "unterminated quoted literal or identifier" } unless quoted
        index, content = quoted
        if quote == '"'
          token = content.gsub(/[^A-Za-z0-9_$]/, "_")
          current << "__quoted_#{token}__"
        else
          current << OPAQUE
        end
      elsif (tag = dollar_quote_tag(text, index))
        index = skip_dollar_quote(text, index, tag)
        return { error: "unterminated dollar-quoted string" } unless index
        current << OPAQUE
      elsif text[index] == ";"
        statements << current
        current = +""
        index += 1
      else
        current << text[index]
        index += 1
      end
    end

    statements << current
    statements.reject { |statement| statement.strip.empty? }
  end

  def skip_line_comment(text, index)
    newline = text.index("\n", index)
    newline ? newline + 1 : text.length
  end

  def skip_block_comment(text, index)
    depth = 0
    cursor = index

    while cursor < text.length
      case text[cursor, 2]
      when "/*" then depth += 1
                     cursor += 2
      when "*/" then depth -= 1
                     cursor += 2
                     return cursor if depth.zero?
      else cursor += 1
      end
    end

    nil
  end

  def consume_quoted(text, index, quote)
    cursor = index + 1
    content = +""

    while cursor < text.length
      if text[cursor] == quote
        if text[cursor + 1] == quote
          content << quote
          cursor += 2
          next
        end

        return [cursor + 1, content]
      end
      content << text[cursor]
      cursor += 1
    end

    nil
  end

  def dollar_quote_tag(text, index)
    return nil unless text[index] == "$"

    match = text[index..].match(/\A\$(?:[A-Za-z_][A-Za-z0-9_]*)?\$/)
    match && match[0]
  end

  def skip_dollar_quote(text, index, tag)
    closing = text.index(tag, index + tag.length)
    closing && closing + tag.length
  end
end
