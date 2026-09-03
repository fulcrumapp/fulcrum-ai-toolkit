// Finding every QUERY() call in a report template, without running it.
//
// A report template's SQL used to be found by matching `QUERY(` followed by a
// backtick. That misses more than it catches: `QUERY("DELETE ...")` uses a
// double-quoted string, `QUERY /* comment */ (`...`)` puts a comment between
// the name and its parenthesis, and a newline does the same thing with
// whitespace. Anything it misses ships unchecked.
//
// So the template is compiled by `ejs` into the JavaScript it would run, that
// JavaScript is parsed by `acorn`, and the tree is walked by `acorn-walk` — all
// three pinned in package-lock.json. A call is found because it is a call in
// the syntax tree, so comments and whitespace are already gone by the time this
// module looks, and the name is compared exactly: the runtime helper is
// spelled QUERY, and a lowercase `query()` is a different function.
//
// The helper is not reachable only by its bare name. `ejs` puts the report
// runtime in scope with `with (locals)`, so the same function is also
// `locals.QUERY` and `locals['QUERY']`, and a member call is still a call.
// Those are read here exactly like a bare one. What cannot be read is refused
// instead: a name referenced without being called, a computed property that is
// not a literal, the `locals` bag used as a value, and `eval` or the Function
// constructor. Each of those can put a query where a syntax tree cannot follow
// it, so each fails closed.
//
// The template is never rendered here and no query is ever issued: compiling
// produces source text, and parsing produces a tree. The SQL argument is read
// out of the tree statically, and anything that cannot be read statically is a
// failure rather than something to guess at, so a dynamically built statement
// fails closed instead of shipping unchecked.

import * as acorn from 'acorn';
import * as walk from 'acorn-walk';
import ejs from 'ejs';

import { INTERPOLATION_PLACEHOLDER } from './sql-contract.mjs';
import { interpolationViolation } from './sql-interpolation.mjs';

// The Fulcrum report runtime spells its helper in capitals.
const QUERY_HELPER = 'QUERY';

// The name `ejs` gives the object it opens with `with`, which holds every
// runtime helper including QUERY.
const LOCALS_BAG = ejs.localsName;

// Names that turn text into code, and so turn a query into something no syntax
// tree can find.
const DYNAMIC_CODE = new Set(['eval', 'Function']);
const REQUIRED_INTRINSIC = 'String';
const ARGUMENTS_OBJECT = 'arguments';

const REFERENCED_NOT_CALLED =
  `${QUERY_HELPER} is referenced somewhere other than a direct call, so an alias could carry SQL past this check`;
const DYNAMIC_PROPERTY =
  'a property is looked up with an expression rather than a literal, so it could resolve to ' +
  `${QUERY_HELPER} without naming it`;
const LOCALS_AS_VALUE =
  `the ${LOCALS_BAG} object is used as a value rather than read through a named property, so ` +
  `${QUERY_HELPER} could be taken out of it unseen`;
const ARGUMENTS_AS_VALUE =
  `${ARGUMENTS_OBJECT} exposes the locals bag indirectly, so QUERY could be taken out unseen`;
const CONSTRUCTOR_ACCESS =
  'constructor access can create code outside the parsed template and is not allowed';
const STRING_SHADOWED =
  `${REQUIRED_INTRINSIC} is shadowed or reassigned, so SQL allowlist filtering cannot trust the intrinsic`;

// The JavaScript `ejs` would run for this template, with every scriptlet in
// place. `generateSource()` is the same step `compile()` takes before it builds
// a function; stopping here means nothing is ever called.
export function compiledSource(text, filename) {
  const template = new ejs.Template(text, { filename });
  template.generateSource();
  return template.source;
}

// One parser configuration for compiled template source, shared by everything
// that reads it.
export function parseSource(source) {
  return acorn.parse(source, {
    ecmaVersion: 'latest',
    sourceType: 'script',
    allowReturnOutsideFunction: true
  });
}

// A template literal contributes its fixed text; each `${...}` gap becomes the
// same placeholder a `:name` gets, but only once the gap has been read as a
// safe encoding of whatever it will hold. A gap that has not earned a
// placeholder is a reason, because substituting one would describe a statement
// other than the one that runs.
function templateLiteralSql(node) {
  if (node.quasis.some((quasi) => quasi.value.cooked == null)) {
    return { reason: 'the SQL argument uses a template literal with an invalid escape sequence' };
  }

  for (const [index, expression] of node.expressions.entries()) {
    const reason = interpolationViolation(
      expression,
      node.quasis[index].value.cooked,
      node.quasis[index + 1].value.cooked
    );
    if (reason) return { reason: `the SQL argument interpolates a value that ${reason}` };
  }

  return { sql: node.quasis.map((quasi) => quasi.value.cooked).join(INTERPOLATION_PLACEHOLDER) };
}

// Returns { sql } when the argument is a statically classifiable string, and
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

function isStaticProperty(node) {
  return node.type === 'Literal' && (typeof node.value === 'string' || typeof node.value === 'number');
}

function dynamicCodeReason(node) {
  return node.callee.type === 'Identifier' && DYNAMIC_CODE.has(node.callee.name)
    ? `${node.callee.name} turns text into code, which no syntax tree can follow`
    : null;
}

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
  // accounted for when the passes below look for names that are not.
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

  walk.simple(tree, {
    CallExpression(node) {
      const reason = dynamicCodeReason(node);
      if (reason) note(node.callee.start, reason);
    },
    NewExpression(node) {
      const reason = dynamicCodeReason(node);
      if (reason) note(node.callee.start, reason);
    },
    MemberExpression(node) {
      if (!node.computed) {
        if (node.property.name === 'constructor') {
          note(node.property.start, CONSTRUCTOR_ACCESS);
        }
        if (DYNAMIC_CODE.has(node.property.name)) {
          note(node.property.start, `${node.property.name} can create or execute code outside the parsed template`);
        }
        if (node.property.name === QUERY_HELPER && !resolved.has(node.property)) {
          note(node.property.start, REFERENCED_NOT_CALLED);
        }
        return;
      }
      if (!isStaticProperty(node.property)) {
        note(node.property.start, DYNAMIC_PROPERTY);
      } else if (node.property.value === 'constructor') {
        note(node.property.start, CONSTRUCTOR_ACCESS);
      } else if (DYNAMIC_CODE.has(node.property.value)) {
        note(
          node.property.start,
          `${node.property.value} can create or execute code outside the parsed template`
        );
      } else if (node.property.value === QUERY_HELPER && !resolved.has(node.property)) {
        note(node.property.start, REFERENCED_NOT_CALLED);
      }
    }
  });

  walk.full(tree, (node) => {
    if (node.type !== 'Identifier') return;
    if (DYNAMIC_CODE.has(node.name)) {
      note(node.start, `${node.name} can create or execute code outside the parsed template`);
    }
    if (node.name === QUERY_HELPER && !resolved.has(node)) {
      note(node.start, REFERENCED_NOT_CALLED);
    }
    if (node.name === LOCALS_BAG && !memberObjects.has(node)) {
      note(node.start, LOCALS_AS_VALUE);
    }
    if (node.name === ARGUMENTS_OBJECT) {
      note(node.start, ARGUMENTS_AS_VALUE);
    }
  });

  walk.simple(tree, {
    VariableDeclarator(node) {
      for (const identifier of boundIdentifiers(node.id)) {
        if (identifier.name === REQUIRED_INTRINSIC) note(identifier.start, STRING_SHADOWED);
      }
    },
    FunctionDeclaration(node) {
      if (node.id?.name === REQUIRED_INTRINSIC) note(node.id.start, STRING_SHADOWED);
      for (const parameter of node.params)
        for (const identifier of boundIdentifiers(parameter))
          if (identifier.name === REQUIRED_INTRINSIC) note(identifier.start, STRING_SHADOWED);
    },
    FunctionExpression(node) {
      if (node.id?.name === REQUIRED_INTRINSIC) note(node.id.start, STRING_SHADOWED);
      for (const parameter of node.params)
        for (const identifier of boundIdentifiers(parameter))
          if (identifier.name === REQUIRED_INTRINSIC) note(identifier.start, STRING_SHADOWED);
    },
    ArrowFunctionExpression(node) {
      for (const parameter of node.params)
        for (const identifier of boundIdentifiers(parameter))
          if (identifier.name === REQUIRED_INTRINSIC) note(identifier.start, STRING_SHADOWED);
    },
    ClassDeclaration(node) {
      if (node.id?.name === REQUIRED_INTRINSIC) note(node.id.start, STRING_SHADOWED);
    },
    AssignmentExpression(node) {
      if (node.left.type === 'Identifier' && node.left.name === REQUIRED_INTRINSIC) {
        note(node.left.start, STRING_SHADOWED);
      }
      if (node.left.type === 'MemberExpression') {
        const property = calleeName(node.left);
        if (property?.name === REQUIRED_INTRINSIC) note(property.spelling.start, STRING_SHADOWED);
      }
    }
  });

  return [...findings.entries()]
    .sort(([left], [right]) => left - right)
    .map(([, result], offset) => ({ ordinal: offset + 1, ...result }));
}
