// Finding every QUERY() call in a report template, and deciding what each
// `${...}` gap in its SQL is allowed to be — all without running anything.
//
// The template is turned into the JavaScript `ejs` would run by
// `Template#generateSource()`, and that JavaScript is parsed by `acorn` and
// walked by `acorn-walk`. Generating source and parsing it are both static
// steps: no function is built from the template and no template is rendered, so
// no example code in this repository ever executes during validation.
//
// A call is found because it is a call in the syntax tree, so comments and
// whitespace are already gone by the time this module looks, and the name is
// compared exactly: the runtime helper is spelled QUERY, and a lowercase
// `query()` is a different function. The helper is not reachable only by its
// bare name — `ejs` puts the report runtime in scope with `with (locals)`, so
// `locals.QUERY` and `locals['QUERY']` are read the same way.
//
// Everything that could put a query where a syntax tree cannot follow it is
// refused instead of guessed at: a name referenced without being called, a
// computed property that is not a literal, the locals bag used as a value, and
// any name that reaches code or an object's internals.
//
// The SQL argument is read out of the tree statically. Anything that cannot be
// read statically is a failure rather than something to guess at, so a
// dynamically built statement fails closed instead of shipping unchecked.

import * as acorn from 'acorn';
import * as walk from 'acorn-walk';
import ejs from 'ejs';

import { INTERPOLATION_PLACEHOLDER } from './sql-contract.mjs';

// The Fulcrum report runtime spells its helper in capitals.
const QUERY_HELPER = 'QUERY';

// The name `ejs` gives the object it opens with `with`, which holds every
// runtime helper including QUERY.
const LOCALS_BAG = ejs.localsName;

// Names — whether written as a variable or as a static property — that reach
// code, an object's internals, or the scope this module cannot see. Each one
// can put a statement somewhere no syntax tree follows, so each fails closed.
const FORBIDDEN_NAMES = new Map([
  ['eval', 'turns text into code, which no syntax tree can follow'],
  ['Function', 'turns text into code, which no syntax tree can follow'],
  ['arguments', 'exposes the locals bag indirectly, so QUERY could be taken out unseen'],
  ['constructor', 'reaches a constructor, which can create code outside the parsed template'],
  ['prototype', 'reaches a prototype, where an intrinsic method could be replaced'],
  ['__proto__', 'reaches a prototype, where an intrinsic method could be replaced'],
  ['globalThis', 'reaches the global object, where any name can be resolved indirectly'],
  ['Reflect', 'can read or write a property this contract cannot name'],
  ['Proxy', 'can make any property lookup run code'],
  ['Object', 'exposes reflection methods that can replace intrinsic encoder behavior']
]);

// The intrinsics the recognized SQL encoders below are written in terms of.
// `('' + value).replace(...)` names neither of them, which is why the examples
// are written that way — but a template that rebinds or rewrites one of them
// would still change what a future encoder means, so both are guarded.
const GUARDED_INTRINSICS = new Set(['String', 'RegExp']);

const REFERENCED_NOT_CALLED =
  `${QUERY_HELPER} is referenced somewhere other than a direct call, so an alias could carry SQL past this check`;
const DYNAMIC_PROPERTY =
  'a property is looked up with an expression rather than a literal, so it could resolve to ' +
  `${QUERY_HELPER} without naming it`;
const LOCALS_AS_VALUE =
  `the ${LOCALS_BAG} object is used as a value rather than read through a named property, so ` +
  `${QUERY_HELPER} could be taken out of it unseen`;

const shadowed = (name) =>
  `${name} is rebound, so the intrinsic the SQL encoders are written against is no longer the one that runs`;
const mutated = (name) =>
  `${name} is assigned to, so the intrinsic the SQL encoders are written against could be replaced`;

// The JavaScript `ejs` would run for this template, with every scriptlet in
// place. `generateSource()` is the step `compile()` takes before it builds a
// function; stopping here means no function is ever built and nothing is run.
export function compiledSource(text, filename) {
  const template = new ejs.Template(text, { filename });
  template.generateSource();
  return template.source;
}

function parseSource(source) {
  return acorn.parse(source, {
    ecmaVersion: 'latest',
    sourceType: 'script',
    allowReturnOutsideFunction: true
  });
}

// A SQL string literal is delimited by single quotes, and PostgreSQL treats a
// backslash inside one as an ordinary character.
const SQL_QUOTE = "'";

// The encoders a `${...}` gap may use, one per literal type the examples build.
// Each is recognized as an exact expression shape rather than analysed, so
// "this gap is safe" is a spelling a reader can check by eye:
//
//   '${('' + day).replace(/[^0-9-]/g, '')}'      a date literal
//   '${('' + name).replace(/[^A-Za-z0-9_-]/g, '')}'   an identifier literal
//
// `('' + value)` converts without naming an intrinsic, so no binding can be
// shadowed to change what it means. The character class then decides what can
// survive: none of these keep the quote that would end the literal, the
// backslash that would escape, the semicolon that would start a statement, or
// the solidus and asterisk that would open a comment. Anything else — a
// variable sanitized further up, a different class, a helper of the template's
// own — is refused, because the value a placeholder stands for would no longer
// be one this file can name.
const SQL_ENCODERS = new Map([
  ['[^0-9-]', 'a date literal'],
  ['[^A-Za-z0-9_-]', 'an identifier literal']
]);

// Exported so self-check.mjs can hold each class to what it actually keeps,
// rather than to the description written beside it.
export const recognizedEncoders = SQL_ENCODERS;

const ENCODER_FLAGS = 'g';
const ENCODER_METHOD = 'replace';

const ENCODER_FORMS = [...SQL_ENCODERS]
  .map(([pattern, type]) => `('' + value).replace(/${pattern}/${ENCODER_FLAGS}, '') for ${type}`)
  .join(', or ');

function isEmptyStringLiteral(node) {
  return node.type === 'Literal' && node.value === '';
}

// Returns null when `node` is one of the recognized encoders, and a reason
// otherwise.
function encoderViolation(node) {
  const generic = `is not one of the recognized SQL encoders: ${ENCODER_FORMS}`;

  if (node.type !== 'CallExpression') return generic;

  const { callee } = node;
  if (callee.type !== 'MemberExpression' || callee.computed) return generic;
  if (callee.property.type !== 'Identifier' || callee.property.name !== ENCODER_METHOD) return generic;

  const receiver = callee.object;
  const convertedWithoutABinding =
    receiver.type === 'BinaryExpression' &&
    receiver.operator === '+' &&
    isEmptyStringLiteral(receiver.left);
  if (!convertedWithoutABinding) {
    return (
      `converts with ${ENCODER_METHOD}() applied to something other than ('' + value), so the receiver ` +
      'is not known to be a string built without a binding this template could rebind'
    );
  }

  if (node.arguments.length !== 2 || !isEmptyStringLiteral(node.arguments[1])) {
    return `does not remove what it matches by replacing it with '', so the removed characters are not gone`;
  }

  const [pattern] = node.arguments;
  if (pattern.type !== 'Literal' || !pattern.regex) {
    return 'filters with something other than a regular expression literal, so what it keeps cannot be read';
  }
  if (pattern.regex.flags !== ENCODER_FLAGS) {
    return `filters with /${pattern.regex.pattern}/${pattern.regex.flags}, and only the ${ENCODER_FLAGS} flag removes every occurrence`;
  }
  if (!SQL_ENCODERS.has(pattern.regex.pattern)) {
    return `filters with /${pattern.regex.pattern}/, which is not a recognized encoder: ${ENCODER_FORMS}`;
  }

  return null;
}

// A template literal contributes its fixed text; each `${...}` gap becomes the
// same placeholder a `:name` gets, but only once the gap has been read as a
// recognized encoder sitting inside a quoted SQL literal. A gap that has not
// earned a placeholder is a reason, because substituting one would describe a
// statement other than the one that runs: `'${$params.q}'` parses as `'NULL'`
// and looks read-only, while at run time the value is whatever the URL says.
function templateLiteralSql(node) {
  if (node.quasis.some((quasi) => quasi.value.cooked == null)) {
    return { reason: 'the SQL argument uses a template literal with an invalid escape sequence' };
  }

  for (const [index, expression] of node.expressions.entries()) {
    const before = node.quasis[index].value.cooked;
    const after = node.quasis[index + 1].value.cooked;
    const reason = !before.endsWith(SQL_QUOTE) || !after.startsWith(SQL_QUOTE)
      ? 'is interpolated outside a quoted SQL string literal, where even encoded characters change the ' +
        'shape of the statement'
      : encoderViolation(expression);
    if (reason) return { reason: `the SQL argument interpolates a value that ${reason}` };
  }

  return { sql: node.quasis.map((quasi) => quasi.value.cooked).join(INTERPOLATION_PLACEHOLDER) };
}

// Returns { sql } when the argument is a statically readable string, and
// { reason } when it is anything else.
function staticSql(node) {
  if (!node) return { reason: `a ${QUERY_HELPER}() call has no SQL argument` };
  if (node.type === 'Literal' && typeof node.value === 'string') return { sql: node.value };
  if (node.type === 'TemplateLiteral') return templateLiteralSql(node);
  return {
    reason:
      `the SQL argument is a ${node.type} rather than a string or template literal, so it cannot be read ` +
      'without running the template; build the statement inline instead'
  };
}

// The name a callee resolves to statically, with the node that spells it, or
// null when the callee names nothing that can be read. `QUERY(...)`,
// `locals.QUERY(...)`, and `locals['QUERY'](...)` all resolve here.
function calleeName(node) {
  if (node.type === 'Identifier') return { name: node.name, spelling: node };
  if (node.type !== 'MemberExpression') return null;
  if (!node.computed && node.property.type === 'Identifier') {
    return { name: node.property.name, spelling: node.property };
  }
  if (node.computed && node.property.type === 'Literal' && typeof node.property.value === 'string') {
    return { name: node.property.value, spelling: node.property };
  }
  return null;
}

// Every identifier a binding form introduces, through whatever pattern spells
// it. A parameter, a destructured property, a rest element, a default, and a
// catch parameter all bind a name the same way.
function boundIdentifiers(node, found = []) {
  if (!node) return found;
  if (node.type === 'Identifier') {
    found.push(node);
  } else if (node.type === 'RestElement') {
    boundIdentifiers(node.argument, found);
  } else if (node.type === 'AssignmentPattern') {
    boundIdentifiers(node.left, found);
  } else if (node.type === 'ArrayPattern') {
    for (const element of node.elements) boundIdentifiers(element, found);
  } else if (node.type === 'ObjectPattern') {
    for (const property of node.properties) {
      boundIdentifiers(property.type === 'RestElement' ? property.argument : property.value, found);
    }
  }
  return found;
}

// Every form that introduces a binding, so a guarded intrinsic cannot be
// rebound by any of them. `catch (String)` binds exactly as a parameter does
// and is listed here for the same reason.
const BINDING_FORMS = {
  VariableDeclarator: (node) => [node.id],
  FunctionDeclaration: (node) => [node.id, ...node.params],
  FunctionExpression: (node) => [node.id, ...node.params],
  ArrowFunctionExpression: (node) => node.params,
  ClassDeclaration: (node) => [node.id],
  ClassExpression: (node) => [node.id],
  CatchClause: (node) => [node.param]
};

// Every QUERY() call in `source`, plus everything that could hide one, in
// source order.
//
// Each entry is either { ordinal, sql } for a statically readable statement or
// { ordinal, reason } for something that was refused instead.
export function queryCalls(source) {
  const tree = parseSource(source);

  const findings = new Map();
  const resolved = new Set();
  const memberObjects = new Set();

  const note = (start, reason) => {
    if (!findings.has(start)) findings.set(start, { reason });
  };

  const readCall = (callee, argument) => {
    const found = calleeName(callee);
    if (!found || found.name !== QUERY_HELPER) return;
    resolved.add(found.spelling);
    findings.set(found.spelling.start, staticSql(argument));
  };

  // Calls first, so a name that turns out to be a QUERY() callee is already
  // accounted for when the pass below looks for names that are not.
  walk.simple(tree, {
    CallExpression(node) {
      readCall(node.callee, node.arguments[0]);
    },
    TaggedTemplateExpression(node) {
      readCall(node.tag, node.quasi);
    },
    MemberExpression(node) {
      memberObjects.add(node.object);
    }
  });

  // One pass for everything else. A name is judged the same way wherever it is
  // written: as a variable, as a static property, or as a binding.
  const checkName = (node, name) => {
    const forbidden = FORBIDDEN_NAMES.get(name);
    if (forbidden) note(node.start, `${name} ${forbidden}`);
    if (name === QUERY_HELPER && !resolved.has(node)) note(node.start, REFERENCED_NOT_CALLED);
  };

  walk.full(tree, (node) => {
    const bindings = BINDING_FORMS[node.type];
    if (bindings) {
      for (const pattern of bindings(node)) {
        for (const identifier of boundIdentifiers(pattern)) {
          if (GUARDED_INTRINSICS.has(identifier.name)) note(identifier.start, shadowed(identifier.name));
        }
      }
    }

    if (node.type === 'Identifier') {
      checkName(node, node.name);
      if (node.name === LOCALS_BAG && !memberObjects.has(node)) note(node.start, LOCALS_AS_VALUE);
      return;
    }

    if (node.type === 'MemberExpression') {
      if (!node.computed) {
        checkName(node.property, node.property.name);
      } else if (node.property.type === 'Literal' && typeof node.property.value === 'string') {
        checkName(node.property, node.property.value);
      } else if (node.property.type !== 'Literal' || typeof node.property.value !== 'number') {
        note(node.property.start, DYNAMIC_PROPERTY);
      }
      return;
    }

    // An assignment cannot rebind a guarded intrinsic, and cannot write through
    // one either: `String.raw = ...` and `String.prototype.replace = ...` both
    // land here, the second having already been refused for naming a prototype.
    if (node.type === 'AssignmentExpression' || node.type === 'UpdateExpression') {
      const target = node.type === 'AssignmentExpression' ? node.left : node.argument;
      if (target.type === 'Identifier' && GUARDED_INTRINSICS.has(target.name)) {
        note(target.start, mutated(target.name));
      }
      if (target.type === 'MemberExpression' && target.object.type === 'Identifier') {
        if (GUARDED_INTRINSICS.has(target.object.name)) note(target.object.start, mutated(target.object.name));
      }
    }
  });

  return [...findings.entries()]
    .sort(([left], [right]) => left - right)
    .map(([, result], offset) => ({ ordinal: offset + 1, ...result }));
}
