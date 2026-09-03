// Structural expectations for the markup in each report template, asserted on
// the template text.
//
// A report template's markup is only half written in HTML; the other half sits
// inside scriptlets, and a `<tr>` emitted from a loop is the classic way a row
// ends up outside the table it belongs to. Running the template would show
// that, but running repository-authored template code is exactly what this
// validator does not do. So each template states its own markup instead: the
// exact set of elements it may emit, checked against the elements it actually
// writes, plus the nesting rules a table imposes.
//
// The declaration is per file and exact, so adding an element to a template
// means saying so here. A template with no entry is a failure rather than a
// skip, so a new example cannot quietly opt out of having its markup checked.

import * as acorn from 'acorn';
import * as walk from 'acorn-walk';

const VOID_ELEMENTS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'source',
  'track',
  'wbr'
]);

// The element each of these must be written inside, whichever branch emits it.
const REQUIRED_ANCESTORS = {
  tr: ['table'],
  td: ['table', 'tr'],
  th: ['table', 'tr'],
  thead: ['table'],
  tbody: ['table']
};

// A row has to be in a row group as well as in a table, because a `<tr>` placed
// directly in `<table>` is the shape the date-range example is written to
// avoid.
const ROW_GROUPS = ['thead', 'tbody', 'tfoot'];

// Every element each report template may emit, in sorted order.
const TEMPLATE_ELEMENTS = {
  'ejs-tag-types.ejs': [],
  'api-fulcrum-rest.ejs': [],
  'conditional-section.ejs': ['div'],
  'html-filter-form.ejs': ['button', 'form', 'input', 'label'],
  'params-date-range.ejs': ['table', 'tbody', 'td', 'th', 'thead', 'tr'],
  'photo-url-signed-src.ejs': ['img'],
  'query-related-records.ejs': ['table', 'tbody', 'td', 'th', 'thead', 'tr'],
  'query-repeatable-join.ejs': [],
  'query-rows-iteration.ejs': ['div'],
  'record-field-access.ejs': [],
  'repeatable-table-rows.ejs': ['table', 'tbody', 'td', 'th', 'thead', 'tr'],
  'sanitize-params-for-sql.ejs': []
};

// Scriptlets, output tags, and template comments alike. What remains is the
// literal markup the template writes, every branch of it.
const EJS_TAG = /<%[\s\S]*?%>/g;
const HTML_TAG = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)\b([^>]*)>/g;
const CONTROL_START = /<%\s*(?:(?:if|for|while|switch)\b|[\w.]+\.forEach\s*\()/gi;
const CONTROL_END = /<%\s*(?:}|}\s*else\b|}\);)/gi;
const OUTPUT_INTERNALS = new Set(['escapeFn', '__append', '__output']);

function spansControlBoundary(tag) {
  if (tag.startsWith('<%#', '<%=', '<%-')) return false;
  const code = tag.slice(2, -2).trim();
  if (code.startsWith('}')) return true;
  const withoutLiterals = code.replace(/(['"`])(?:\\.|(?!\1)[^\\])*\1/g, '');
  return (withoutLiterals.match(/{/g) ?? []).length !== (withoutLiterals.match(/}/g) ?? []).length;
}

function authoredJavaScript(text) {
  const pieces = [];
  for (const match of text.matchAll(/<%([#=-]?)([\s\S]*?)%>/g)) {
    const [, kind, body] = match;
    if (kind === '#') continue;
    pieces.push(kind === '=' || kind === '-' ? `void (${body});` : body);
  }
  return pieces.join('\n');
}

function outputInternalViolations(text) {
  let tree;
  try {
    tree = acorn.parse(authoredJavaScript(text), {
      ecmaVersion: 'latest',
      sourceType: 'script',
      allowReturnOutsideFunction: true
    });
  } catch (error) {
    return [`author-authored EJS JavaScript is not statically parseable: ${error.message}`];
  }

  const found = new Set();
  walk.full(tree, (node) => {
    if (node.type === 'Identifier' && OUTPUT_INTERNALS.has(node.name)) found.add(node.name);
  });
  return [...found].map(
    (name) => `references EJS output internal ${name}, whose emitted markup cannot be proven statically`
  );
}

// Returns [] when the template's markup matches its declaration and nests
// correctly, and one reason per problem otherwise.
export function markupViolations(basename, text) {
  const declared = TEMPLATE_ELEMENTS[basename];
  if (!declared) {
    return ['has no markup declaration in lib/template-markup.mjs, so its markup was never checked'];
  }
  return markupViolationsAgainst(declared, text);
}

// The same judgement against a declaration given directly, so the probes in
// self-check.mjs exercise this exact code rather than a copy of it.
export function markupViolationsAgainst(declared, text) {
  if (/<%-/.test(text)) {
    return ['uses an unescaped EJS output tag, whose emitted markup cannot be proven statically'];
  }
  const internalViolations = outputInternalViolations(text);
  if (internalViolations.length > 0) return internalViolations;
  if (/<\/?<%[=-]/.test(text)) {
    return ['constructs an HTML tag name through EJS output, which cannot be proven statically'];
  }
  if (
    /<%\s*(?:(?:if|for|while|switch)\b|[\w.]+\.forEach\s*\()[\s\S]*?%>\s*<(?:table|thead|tbody)\b/i.test(
      text
    )
  ) {
    return ['opens a table structural container inside template control flow'];
  }

  const markup = text.replace(EJS_TAG, '');
  const violations = [];
  const written = new Set();
  const open = [];

  if (declared.includes('tr')) {
    const firstControl = [...text.matchAll(CONTROL_START)][0]?.index;
    const lastControlEnd = [...text.matchAll(CONTROL_END)].at(-1);
    const requiredOpenings = ['table', 'thead', 'tbody']
      .filter((name) => declared.includes(name))
      .map((name) => `<${name}`);
    const requiredClosings = ['tbody', 'table']
      .filter((name) => declared.includes(name))
      .map((name) => `</${name}>`);
    const tablePosition = text.indexOf('<table');
    const prefix = tablePosition < 0 ? text : text.slice(0, tablePosition);
    if (
      [...prefix.matchAll(EJS_TAG)].some(([tag]) => spansControlBoundary(tag))
    ) {
      violations.push('<table> must not be opened after template control flow');
    }

    for (const row of text.matchAll(/<tr\b[\s\S]*?<\/tr>/gi)) {
      const rowControl = [...row[0].matchAll(EJS_TAG)].some(([tag]) => spansControlBoundary(tag));
      if (rowControl) violations.push('each <tr> must be a complete child node outside control-flow tags');
    }

    for (const opening of requiredOpenings) {
      const position = text.indexOf(opening);
      if (position < 0 || (firstControl !== undefined && position > firstControl)) {
        violations.push(`${opening}> must open unconditionally before row control flow`);
      }
    }
    for (const closing of requiredClosings) {
      const position = text.lastIndexOf(closing);
      if (position < 0 || (lastControlEnd && position < lastControlEnd.index)) {
        violations.push(`${closing} must close unconditionally after row control flow`);
      }
    }
  }

  for (const [, closing, rawName, attributes] of markup.matchAll(HTML_TAG)) {
    const name = rawName.toLowerCase();
    written.add(name);

    if (closing) {
      const expected = open.pop();
      if (expected !== name) {
        violations.push(`closes </${name}> where ${expected ? `</${expected}>` : 'nothing'} was open`);
      }
      continue;
    }

    for (const ancestor of REQUIRED_ANCESTORS[name] ?? []) {
      if (!open.includes(ancestor)) violations.push(`writes <${name}> outside a <${ancestor}>`);
    }
    if (name === 'tr' && !ROW_GROUPS.some((group) => open.includes(group))) {
      violations.push(`writes <tr> outside a ${ROW_GROUPS.join(", a ")}`);
    }

    if (!VOID_ELEMENTS.has(name) && !attributes.trimEnd().endsWith('/')) open.push(name);
  }

  for (const name of open) violations.push(`leaves <${name}> unclosed`);

  const found = [...written].sort();
  const undeclared = found.filter((name) => !declared.includes(name));
  const unwritten = declared.filter((name) => !written.has(name));
  if (undeclared.length > 0) {
    violations.push(`emits ${undeclared.join(", ")}, which its markup declaration does not list`);
  }
  if (unwritten.length > 0) {
    violations.push(`declares ${unwritten.join(", ")}, which it no longer emits`);
  }

  return violations;
}
