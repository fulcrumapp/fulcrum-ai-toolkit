// Rendering a report template, and proving the fixtures reached every branch.
//
// A report template's markup is only half written in HTML; the other half is
// produced by its scriptlets. A `<tr>` inside a `forEach` is invisible to a
// static reader of the file, so rendering the template and validating what
// comes out is what closes that gap — but only for the branches that actually
// ran. A no-results row that no fixture ever reaches is exactly as unvalidated
// as it was before, and nothing says so.
//
// So the template is run under coverage. `ejs` compiles it to JavaScript, that
// JavaScript is placed in a function this module builds, and V8's own block
// coverage — the counter behind `node --experimental-test-coverage`, reached
// through `node:inspector` — records which blocks ran. A block that no fixture
// reached comes back with a count of zero and is reported against the template
// line it came from, so "the fixtures cover this template" is measured rather
// than assumed.
//
// Three details make the measurement mean what it says.
//
// The wrapper around the template holds no conditional of its own — no
// `locals || {}`, no `if` inside `__append` — so every branch V8 reports
// belongs to the template. What `ejs` would decide in those places is decided
// here instead, by the plain functions passed in.
//
// V8 reports a block that did not run, and a branch never written is not a
// block. `if (ok) { ... }` whose test is always true has nothing to report,
// even though its other outcome was never rendered. So every `if` without an
// `else` is given one before the function is built. The added block holds
// nothing but a line marker, changes nothing about what the template does, and
// turns "this outcome never happened" into a block with a count of zero.
//
// A count of zero is only useful if it can be named. `ejs` leaves a `__line`
// marker before each run of template text, which is what turns a position in
// compiled JavaScript back into a template line — but the marker nearest a
// block is often the one that closes it rather than the one that opens it. So
// both outcomes of every `if` are opened with the marker for the `if` itself,
// and a reported line is the line a reader would go look at.
//
// Nothing here reaches the network or the Query API: the helpers a template
// calls come from its fixture data, and rendering is a function call.

import inspector from 'node:inspector';

import * as walk from 'acorn-walk';
import ejs from 'ejs';

import { compiledSource, parseSource } from './ejs-queries.mjs';

// Named so the coverage report can be told apart from every other script in the
// process, and numbered so no two renders share a name. The number also keeps
// the source text unique, which matters: V8 caches a compiled script by its
// source, and a reused script would carry counts from an earlier render into
// this one.
const COVERAGE_URL = 'fulcrum-report-template://render';
let renderOrdinal = 0;

// What `ejs` puts around a template's generated source, rewritten without a
// branch. `__append` and the locals bag behave as `ejs` compiles them to; the
// decisions they contain are made by `__text` and by the caller instead, where
// V8 attributes them to this file rather than to the template.
const PREAMBLE = [
  'let __output = "";',
  'function __append(s) { __output += __text(s); }',
  'let __line = 1;',
  'with (locals) {'
].join('\n');
const POSTAMBLE = ['}', 'return __output;'].join('\n');
const PARAMETERS = 'locals, escapeFn, include, __text';

const LINE_MARKER = '__line';

// The escape function `ejs` itself would use, taken from `ejs` rather than
// written again here.
const ESCAPE = new ejs.Template('', {}).opts.escapeFunction;

const TEXT = (value) => (value === undefined || value === null ? '' : value);

const INCLUDE = () => {
  throw new Error('include() is not available to an externalized example');
};

function post(session, method, parameters) {
  return new Promise((resolve, reject) => {
    session.post(method, parameters, (error, result) => (error ? reject(error) : resolve(result)));
  });
}

// Every `__line = N` marker in `source`, with the offset it sits at. `ejs`
// emits one before each run of template text, so a position in the compiled
// source can be traced back to the template line it came from.
function lineMarkers(source) {
  const markers = [];
  const record = (node, target, value) => {
    if (target.type !== 'Identifier' || target.name !== LINE_MARKER) return;
    if (!value || value.type !== 'Literal' || typeof value.value !== 'number') return;
    markers.push({ start: node.start, line: value.value });
  };

  walk.simple(parseSource(source), {
    AssignmentExpression(node) {
      record(node, node.left, node.right);
    },
    VariableDeclarator(node) {
      record(node, node.id, node.init);
    }
  });

  return markers.sort((left, right) => left.start - right.start);
}

function markerLineAt(markers, start) {
  let line = 1;
  for (const marker of markers) {
    if (marker.start > start) break;
    line = marker.line;
  }
  return line;
}

// The template line a zero-count range belongs to: the first marker the range
// encloses, or the last one before it when it encloses none.
function rangeLine(markers, range) {
  const inside = markers.find(
    (marker) => marker.start >= range.startOffset && marker.start < range.endOffset
  );
  return inside ? inside.line : markerLineAt(markers, range.startOffset);
}

// Gives every `if` an `else`, so an outcome that never happened is a block V8
// can report, and opens both outcomes with the line marker for the `if` itself,
// so each is reported against the line a reader would look at rather than
// against whatever marker happened to be nearest.
function withBranchMarkers(source) {
  const markers = lineMarkers(source);
  const insertions = [];
  const insert = (at, text) => insertions.push({ at, text });

  walk.simple(parseSource(source), {
    IfStatement(node) {
      const marker = `${LINE_MARKER} = ${markerLineAt(markers, node.start)};`;

      insert(node.consequent.start, `{ ${marker}`);
      if (!node.alternate) {
        insert(node.consequent.end, `} else { ${marker} }`);
        return;
      }

      insert(node.consequent.end, '}');
      // An `else if` is an `if` of its own and is marked when it is visited;
      // wrapping it here would only bury the line it reports.
      if (node.alternate.type === 'IfStatement') return;
      insert(node.alternate.start, `{ ${marker}`);
      insert(node.alternate.end, '}');
    }
  });

  let rewritten = source;
  for (const insertion of insertions.sort((left, right) => right.at - left.at)) {
    rewritten = rewritten.slice(0, insertion.at) + insertion.text + rewritten.slice(insertion.at);
  }
  return rewritten;
}

function templateFunction(source, url) {
  const body = `${PREAMBLE}\n${source}\n${POSTAMBLE}\n//# sourceURL=${url}`;
  return new Function(PARAMETERS, body);
}

// Returns { html } for a scenario, or { error } when the template throws — a
// free name with no fixture behind it lands here rather than passing silently.
function renderOnce(render, scenario) {
  try {
    return { name: scenario.name, html: render(scenario.locals, ESCAPE, INCLUDE, TEXT) };
  } catch (error) {
    return { name: scenario.name, error: String(error && error.message ? error.message : error) };
  }
}

function uncoveredLines(scripts, url, source, templateText) {
  const script = scripts.find((entry) => entry.url === url);
  if (!script) throw new Error('V8 reported no coverage for the rendered template');

  const markers = lineMarkers(source);
  const templateLines = templateText.split('\n');
  const found = new Map();

  for (const covered of script.functions) {
    for (const range of covered.ranges) {
      if (range.count !== 0) continue;
      const line = rangeLine(markers, range);
      if (found.has(line)) continue;
      found.set(line, (templateLines[line - 1] ?? '').trim());
    }
  }

  return [...found.entries()]
    .sort(([left], [right]) => left - right)
    .map(([line, text]) => ({ line, text }));
}

// Renders `text` once per scenario and reports which of its branches no
// scenario reached.
//
// Returns { renders, uncovered }: one { name, html } or { name, error } per
// scenario, and one { line, text } per template line holding a block that never
// ran. Coverage is started before the function is built, because V8 counts
// blocks only in a script compiled while it is counting, and taken immediately
// after, because taking it resets the counters.
export async function renderScenarios(text, filename, scenarios) {
  const source = withBranchMarkers(compiledSource(text, filename));
  const url = `${COVERAGE_URL}/${(renderOrdinal += 1)}`;
  const session = new inspector.Session();
  session.connect();

  try {
    await post(session, 'Profiler.enable');
    await post(session, 'Profiler.startPreciseCoverage', { callCount: true, detailed: true });

    const render = templateFunction(source, url);
    const renders = scenarios.map((scenario) => renderOnce(render, scenario));

    const { result } = await post(session, 'Profiler.takePreciseCoverage');
    await post(session, 'Profiler.stopPreciseCoverage');

    return { renders, uncovered: uncoveredLines(result, url, render.toString(), text) };
  } finally {
    session.disconnect();
  }
}
