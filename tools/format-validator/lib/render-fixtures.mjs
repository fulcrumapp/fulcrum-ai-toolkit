// Fixture data for rendering each report template.
//
// Nothing here reaches the network or the Query API. Every runtime helper is a
// local function returning fixed, neutral data: QUERY() returns rows without a
// database, API() returns a shape without a request, and PHOTOURL() returns a
// URL on the reserved `.invalid` domain, which by RFC 6761 can never resolve.
// Discovering a template's SQL is a separate, entirely static job that belongs
// to ejs-queries.mjs and never renders anything.
//
// The fixtures are per template rather than shared, because the interesting
// markup bugs live in the branches and one set of data cannot reach all of
// them. A template that only ever renders with a photo never renders the case
// where there is none; a table that only ever renders with rows never renders
// its no-results row, which is where a loose `<tr>` hides. So each template
// below lists the outcomes it can produce, and render-coverage.mjs measures
// whether the list is complete: a branch no scenario reaches is reported
// against its template line rather than left to be assumed.
//
// A template with no fixtures is a failure, not a skip, so adding an example
// cannot quietly opt out of being rendered.

const NEUTRAL_TEXT = 'Example value';
const NEUTRAL_RECORD_ID = 'example-record-id';
const NEUTRAL_MEDIA_ID = 'example-media-id';
// `.invalid` is reserved by RFC 6761 and never resolves.
const NEUTRAL_URL = 'https://example.invalid/media/example.jpg';

// A result row answers any column name with the same neutral text, so a
// template that reads a column this file has never heard of still renders.
const NEUTRAL_ROW = new Proxy(
  {},
  { get: (_target, key) => (typeof key === 'string' ? NEUTRAL_TEXT : undefined) }
);

// A REST response answers any collection name with one neutral member, which
// covers `choiceLists.choice_lists[0].name` and its siblings.
const NEUTRAL_API_RESPONSE = new Proxy(
  {},
  { get: (_target, key) => (typeof key === 'string' ? [{ name: NEUTRAL_TEXT }] : undefined) }
);

// One form value as the runtime exposes it: what is stored, what is rendered,
// and the `items` a repeatable or media field carries.
function field(overrides = {}) {
  return {
    value: NEUTRAL_TEXT,
    displayValue: NEUTRAL_TEXT,
    mediaID: NEUTRAL_MEDIA_ID,
    items: [],
    ...overrides
  };
}

// `find()` answers only the data names a scenario defines, and returns
// undefined for the rest — which is what the runtime does for an unknown name,
// and what every example is written to guard against.
function formValues(fields) {
  return { find: (name) => fields[name] };
}

function mediaItem() {
  return { mediaID: NEUTRAL_MEDIA_ID };
}

function childItem(fields) {
  return { mediaID: NEUTRAL_MEDIA_ID, formValues: formValues(fields) };
}

function locals({ fields = {}, rows = 0, params = {}, recordId = NEUTRAL_RECORD_ID, free = {} } = {}) {
  return {
    $params: params,
    record: {
      id: recordId,
      formValues: formValues(fields)
    },
    QUERY: () => ({ rows: Array.from({ length: rows }, () => NEUTRAL_ROW) }),
    API: () => NEUTRAL_API_RESPONSE,
    PHOTOURL: () => NEUTRAL_URL,
    FORMATDATE: () => '2024-01-01',
    ...free
  };
}

// One scenario: a name for what it represents, and the runtime it renders
// against. Exported because self-check.mjs builds scenarios for its own
// fixtures out of the same data the repository's templates get.
export function scenario(name, specification) {
  return { name, locals: locals(specification) };
}

const VALID_RANGE = { start_date: '2024-01-01', end_date: '2024-03-31' };

// One neutral scenario, for markup fixtures that are written here rather than
// read out of the repository.
export const DEFAULT_SCENARIO = scenario('populated', { rows: 2 });

const TEMPLATE_SCENARIOS = {
  'ejs-tag-types.ejs': [
    scenario('populated', { free: { expression: NEUTRAL_TEXT, statement: NEUTRAL_TEXT } })
  ],

  'api-fulcrum-rest.ejs': [scenario('populated', {})],

  'conditional-section.ejs': [
    scenario('follow-up with a reason', {
      fields: {
        followup_status: field({ value: 'required' }),
        followup_reason: field()
      }
    }),
    scenario('follow-up without a reason', {
      fields: { followup_status: field({ value: 'required' }) }
    }),
    scenario('no follow-up field', { fields: {} })
  ],

  'html-filter-form.ejs': [
    scenario('range submitted', {
      params: VALID_RANGE,
      free: { startDate: VALID_RANGE.start_date, endDate: VALID_RANGE.end_date }
    }),
    scenario('nothing submitted', { params: {}, free: { startDate: '', endDate: '' } })
  ],

  // Every rejection this template can reach is its own scenario, because each
  // one is a different reason a date is not a date: a shape that is not
  // YYYY-MM-DD, a year outside the range a report can mean, a month that does
  // not exist, a day that rolls over into the next month, and a range that runs
  // backwards.
  'params-date-range.ejs': [
    scenario('rows in range', { params: VALID_RANGE, rows: 2 }),
    scenario('no rows in range', { params: VALID_RANGE, rows: 0 }),
    scenario('no range supplied', { params: {}, rows: 0 }),
    scenario('malformed start date', {
      params: { ...VALID_RANGE, start_date: '2024-1-1' }
    }),
    scenario('start date year out of range', {
      params: { ...VALID_RANGE, start_date: '0000-01-01' }
    }),
    scenario('start date that rolls into the next month', {
      params: { ...VALID_RANGE, start_date: '2024-02-31' }
    }),
    scenario('end date with no such month', { params: { end_date: '2024-13-01' } }),
    scenario('reversed range', { params: { start_date: '2024-03-31', end_date: '2024-01-01' } })
  ],

  'photo-url-signed-src.ejs': [
    scenario('photo attached', { fields: { site_photo: field({ items: [mediaItem()] }) } }),
    scenario('photo field left empty', { fields: { site_photo: field({ items: [] }) } })
  ],

  'query-related-records.ejs': [
    scenario('related records found', { fields: { site_id: field() }, rows: 2 }),
    scenario('no site id and no related records', { fields: {}, rows: 0 })
  ],

  'query-repeatable-join.ejs': [scenario('child rows found', { rows: 2 })],

  'query-rows-iteration.ejs': [scenario('rows found', { rows: 2 })],

  'record-field-access.ejs': [
    scenario('every field answered', {
      fields: {
        inspector_name: field(),
        site_condition: field(),
        photos_taken: field(),
        inspection_date: field({ value: '2024-01-01' })
      }
    }),
    scenario('no field answered', { fields: {} })
  ],

  'repeatable-table-rows.ejs': [
    scenario('child entries with values', {
      fields: {
        observations: field({
          items: [
            childItem({ species: field(), count: field() }),
            childItem({ species: field(), count: field() })
          ]
        })
      }
    }),
    scenario('child entries missing values', {
      fields: { observations: field({ items: [childItem({})] }) }
    }),
    scenario('no repeatable field', { fields: {} })
  ],

  'sanitize-params-for-sql.ejs': [
    scenario('status supplied', { params: { status: 'complete' }, rows: 2 }),
    scenario('no status supplied', { params: {}, rows: 0 })
  ]
};

// The scenarios for a template, or null when it has none — which is a failure
// rather than a reason to skip it.
export function scenariosFor(basename) {
  return TEMPLATE_SCENARIOS[basename] ?? null;
}

// A report template is pasted into the body of a report, and an element is only
// misplaced relative to a parent. Validated on its own, a loose `<tr>` is
// accepted, because a fragment could be inserted anywhere; validated inside the
// body it is actually pasted into, it is not. So the rendered output is placed
// in the smallest valid host document before it is checked.
const HOST_PREFIX =
  '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<title>Report</title>\n</head>\n<body>\n';
const HOST_SUFFIX = '\n</body>\n</html>\n';

// How many lines the host adds above the rendered output, so a reported line
// number points at the rendered output rather than at the host.
export const HOST_LINE_OFFSET = HOST_PREFIX.split('\n').length - 1;

export function hostDocument(html) {
  return `${HOST_PREFIX}${html}${HOST_SUFFIX}`;
}
