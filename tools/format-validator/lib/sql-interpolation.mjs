// What a `${...}` gap in a report template's SQL is allowed to be.
//
// The Query API takes one complete SQL string and exposes no server-side bind
// parameters, so a report template builds its own statement and owns every
// literal in it. Reading that statement statically means replacing each gap
// with a placeholder — and a placeholder says nothing about what the gap will
// actually hold. `WHERE q = '${$params.q}'` parses as `WHERE q = 'NULL'` and
// looks read-only, while at run time `$params.q` is whatever the URL says: a
// value of `' OR 1=1 --` closes the quote and the rest of the statement is no
// longer the one that was validated.
//
// So the placeholder is only earned. A gap is accepted when the template can be
// read, at the gap itself, as confining the value to characters that cannot
// leave the literal it sits in; anything else is refused. Two forms qualify:
//
//   '${String(value).replace(/[^A-Za-z0-9_-]/g, '')}'   an allowlist filter
//   '${'complete'}'                                      a fixed string
//
// Both requirements are checked, and both matter. The filter proves what
// characters can survive; the surrounding quotes prove where those characters
// land. A filtered value inside quotes cannot end the literal, start a comment,
// or begin a second statement, so substituting a placeholder for it describes
// the statement that will actually run.
//
// This is deliberately syntactic. It reads the gap and nothing else: no
// variable is followed back to where it was assigned, so a value sanitized at a
// distance is refused rather than guessed at. Sanitizing where the value enters
// SQL is also the practice the examples are meant to teach.

// The value is filtered by String.prototype.replace, reached through String()
// so the receiver is known to be a string rather than an object that answers to
// `replace`.
const FILTER_RECEIVER = 'String';
const FILTER_METHOD = 'replace';

// A SQL string literal is delimited by single quotes, and PostgreSQL treats a
// backslash inside one as an ordinary character.
const SQL_QUOTE = "'";

// What a filtered value may still contain. A quote cannot end the literal, a
// backslash cannot escape, a semicolon cannot start a statement, and a solidus
// or asterisk cannot open a comment, because none of them are here.
const SAFE_CHARACTER = /^[A-Za-z0-9_-]$/;

// The filter must be one negated character class written in printable ASCII,
// with no escape, no nested class, and the global flag. That shape is what
// makes the surviving set knowable: every character the class does not list is
// removed, the class lists only ASCII, and so everything above ASCII is removed
// too without having to be enumerated.
const NEGATED_CLASS = /^\[\^([ -~]+)\]$/;
const CLASS_ESCAPE_OR_NESTING = /[\\\][]/;
const REQUIRED_FLAGS = 'g';

// Every character the class keeps. Scanning the first 256 code points is
// enough: the class body is ASCII, so no character above it can be a member,
// and a negated class removes every non-member.
function survivingCharacters(pattern) {
  const matcher = new RegExp(pattern);
  const surviving = [];
  for (let code = 0; code < 256; code += 1) {
    const character = String.fromCharCode(code);
    if (!matcher.test(character)) surviving.push(character);
  }
  return surviving;
}

function unsafeCharacters(characters) {
  return characters.filter((character) => !SAFE_CHARACTER.test(character));
}

function describe(characters) {
  return characters.map((character) => JSON.stringify(character)).join(', ');
}

// Returns null when `node` is an allowlist regular expression, and a reason
// otherwise.
function allowlistViolation(node) {
  if (node?.type !== 'Literal' || !node.regex) {
    return 'filters with something other than a regular expression literal, so the characters it keeps cannot be read';
  }

  const { pattern, flags } = node.regex;
  if (flags !== REQUIRED_FLAGS) {
    return `filters with /${pattern}/${flags}, and only the ${REQUIRED_FLAGS} flag removes every occurrence`;
  }

  const body = NEGATED_CLASS.exec(pattern);
  if (!body || CLASS_ESCAPE_OR_NESTING.test(body[1])) {
    return (
      `filters with /${pattern}/, which is not a single negated character class of plain ASCII; ` +
      'only that shape says exactly which characters survive'
    );
  }

  const surviving = survivingCharacters(pattern);
  if (surviving.length === 0) {
    return `filters with /${pattern}/, which removes every character`;
  }

  const unsafe = unsafeCharacters(surviving);
  if (unsafe.length > 0) {
    return `filters with /${pattern}/, which still allows ${describe(unsafe)} through`;
  }

  return null;
}

// Returns null when `node` is `String(...).replace(<allowlist>, '')`, and a
// reason otherwise.
function filterViolation(node) {
  const generic =
    'is neither a fixed string nor an allowlist filter of the form ' +
    "String(value).replace(/[^A-Za-z0-9_-]/g, '')";

  if (node.type !== 'CallExpression') return generic;

  const { callee } = node;
  if (callee.type !== 'MemberExpression' || callee.computed) return generic;
  if (callee.property.type !== 'Identifier' || callee.property.name !== FILTER_METHOD) return generic;

  const receiver = callee.object;
  const wrappedInString =
    receiver.type === 'CallExpression' &&
    receiver.callee.type === 'Identifier' &&
    receiver.callee.name === FILTER_RECEIVER;
  if (!wrappedInString) {
    return (
      `calls .${FILTER_METHOD}() on a value that is not wrapped in ${FILTER_RECEIVER}(), so the receiver ` +
      'is not known to be a string'
    );
  }

  if (node.arguments.length !== 2) {
    return `calls .${FILTER_METHOD}() with ${node.arguments.length} arguments instead of a pattern and a replacement`;
  }

  const [pattern, replacement] = node.arguments;
  if (replacement.type !== 'Literal' || replacement.value !== '') {
    return `replaces what it removes with something other than '', so the removed characters are not gone`;
  }

  return allowlistViolation(pattern);
}

// Returns null when `node` is a fixed string of safe characters, a reason when
// it is a fixed string that is not, and undefined when it is not a fixed string
// at all.
function literalViolation(node) {
  if (node.type !== 'Literal' || typeof node.value !== 'string') return undefined;

  const unsafe = unsafeCharacters([...node.value]);
  if (unsafe.length > 0) {
    return `is the fixed string ${JSON.stringify(node.value)}, which contains ${describe(unsafe)}`;
  }
  return null;
}

// Returns null when the gap is safe, and a reason otherwise. `before` and
// `after` are the template literal's own text on either side of the gap, which
// is what says whether the value lands inside a quoted SQL literal.
export function interpolationViolation(expression, before, after) {
  if (!before.endsWith(SQL_QUOTE) || !after.startsWith(SQL_QUOTE)) {
    return (
      'is interpolated outside a quoted SQL string literal, where even filtered characters ' +
      'change the shape of the statement'
    );
  }

  const literal = literalViolation(expression);
  if (literal !== undefined) return literal;

  return filterViolation(expression);
}
