---
name: fulcrum-data-events
description: Use when writing, reviewing, or debugging Fulcrum data events (JavaScript). Covers patterns, anti-patterns, platform constraints, event lifecycle, and security. Also use when a builder asks about automating behavior in a Fulcrum app.
---

A **data event** is JavaScript that runs inside a Fulcrum app in response to record lifecycle events. It executes on-device (mobile) and in-browser (web) — there is no server. Every data event shares a single `script` field on the form.

## Event Lifecycle

Fulcrum has three families of events. Getting the family right matters — `edit-record` is **not** a field-change event.

**Record events** — one callback per record lifecycle moment:

| Event | When it fires |
|-------|--------------|
| `load-record` | Record editor opens (new *and* existing records) — one-time setup |
| `new-record` | A new record is created, after `load-record` — new-record-only defaults |
| `edit-record` | An **existing** record is opened, after `load-record` — fires once, not on every change |
| `validate-record` | Right before save — call `INVALID('msg')` to block the save (synchronous only) |
| `save-record` | Immediately before save, after validation — last-second updates (no async) |
| `change-status` | Record status changes (not on defaults; not when set via `SETSTATUS()`) |
| `change-geometry` | Record location changes (not when set via `SETLOCATION()`/`SETGEOMETRY()`) |

**Field events** — pass the field data_name as the second argument:

| Event | When it fires |
|-------|--------------|
| `change` | A field's value changes — **this is the event for cascading, visibility, and compute** |
| `click` | A hyperlink field is tapped (used to open app extensions) |
| `focus` / `blur` | A text/numeric field gains / loses focus |

**Repeatable events** — pass the repeatable field data_name as the second argument: `new-repeatable`, `edit-repeatable`, `save-repeatable`, `validate-repeatable`, `load-repeatable`, `remove-repeatable`. Use these to auto-number, validate, and aggregate repeatable items.

> **`change` does not fire after `SETVALUE()`.** Setting a value programmatically does not re-trigger `change` for that field (it does fire for calculated fields that depend on it). Never rely on a `SETVALUE` to cascade into another `change` handler.

## Core Patterns

### Set field values
```javascript
ON('change-status', function(event) {
  SETVALUE('status_date', new Date());
  SETVALUE('status_by', USERFULLNAME());
});
```

### Conditional visibility
```javascript
ON('change', 'permit_required', function(event) {
  SETHIDDEN('permit_number', CHOICEVALUE($permit_required) !== 'Yes');
});
```

### Cascading choices
```javascript
ON('change', 'state', function(event) {
  var counties = COUNTIES_BY_STATE[CHOICEVALUE($state)];
  SETCHOICES('county', counties || []);
});
```

### Load reference data
`LOADRECORDS()` takes an **options object** and an **async callback** — it does not return records directly.
```javascript
ON('load-record', function(event) {
  LOADRECORDS({ form_id: FORM().id, limit: 200 }, function(error, result) {
    if (error) { return; }
    var records = Array.isArray(result) ? result : result.records;
    // Use loaded records to populate choices or validate
  });
});
```

> **Platform Requirement — Elite plan:** `LOADRECORDS()` and `LOADFILE()` require an Elite plan or Developer Pack. On Professional, only `REQUEST()` is available for external data. If you write `LOADRECORDS()` on a Professional org it silently fails — no error, no data.

### Share code across apps with LOADFILE
Store shared JavaScript in a Reference File, then load it into multiple apps at runtime. This is the standard code reuse pattern for builders maintaining several apps.

```javascript
// In the data event script:
ON('load-record', function(event) {
  LOADFILE('https://your-cdn.example.com/shared-helpers.js');
  // Functions defined in shared-helpers.js are now available
  var result = mySharedFunction($some_field);
  SETVALUE('computed_field', result);
});
```

Reference Files can be hosted on your own CDN or via Fulcrum's reference file storage. Lock the URL to a versioned file — not `latest`.

> **Platform Requirement — Elite plan:** `LOADFILE()` requires Elite or Developer Pack. See note above.

### Session state with STORAGE
`STORAGE()` returns a storage object with `getItem`, `setItem`, `removeItem`, and `clear` methods — like `localStorage`. Values must be **strings**, so serialize objects with `JSON.stringify`. Use it to cache expensive results or carry state between events.

```javascript
ON('load-record', function(event) {
  var storage = STORAGE();
  // Cache an expensive computation so later events can reuse it
  if (!storage.getItem('baseline')) {
    storage.setItem('baseline', JSON.stringify(computeBaseline()));
  }
  var baseline = JSON.parse(storage.getItem('baseline'));
});
```

### Validate before save
```javascript
ON('validate-record', function(event) {
  if (!$photo_field || $photo_field.length === 0) {
    INVALID('At least one photo is required');
  }
});
```

### Seeding a record created from a link picker

When a Record Link field allows creating records, the child record is born with **nothing**
from its parent. `record_defaults` copies only FROM the linked record INTO the current one —
there is no reverse mechanism — and **`default_previous_value` on the link does not pre-fill
it** in this path (verified on-device).

That matters when the parent holds context the child needs to be findable later. A site
created from a form's picker with no project attached will not match that form's
project-filtered picker on the *next* record — it looks like the site vanished.

Remember the value on the device and default it on new records:

```javascript
var LAST_KEY = 'app.lastProject';

// Record link values may arrive as ['id'] or as [{record_id: 'id'}] — normalise.
function linkIds(value) {
  var ids = [];
  for (var i = 0; i < (value || []).length; i++) {
    var e = value[i];
    var id = typeof e === 'string' ? e : e && e.record_id;
    if (id) { ids.push(id); }
  }
  return ids;
}

ON('new-record', function () {
  if (linkIds($project_link).length) { return; }   // never override an explicit choice
  var raw = STORAGE().getItem(LAST_KEY);
  if (!raw) { return; }
  var last = JSON.parse(raw);
  SETVALUE('project_link', [last.id]);             // array of bare id strings
  SETVALUE('project_name', last.name);
});

// Remember at SAVE, not on change: fields populated by record_defaults settle outside your
// control, and a value is not reliably readable straight after it is set.
ON('save-record', function () {
  var ids = linkIds($project_link);
  if (ids.length && $project_name) {
    STORAGE().setItem(LAST_KEY, JSON.stringify({ id: ids[0], name: $project_name }));
  }
});
```

> **`SETVALUE` on a Record Link takes an array of bare record-id strings** — `['abc-123']`,
> not `[{record_id: 'abc-123'}]` — even though the API stores the object form. Verified
> on-device.

Pair this with a tolerant filter on the picker (match the expected value **or** empty), so a
child created before the script ever ran is still visible. The script keeps the data clean;
the filter keeps the workflow unbroken when it doesn't.

## Anti-patterns

### SETVALUE fails silently on a wrong data_name
`SETVALUE('nonexistent_field', x)` does nothing and throws no error — the event fires, the condition matches, `SETVALUE` runs, and the field stays blank. This is the single hardest data-event bug to find. **Verify every data_name against the live form before writing handlers.**

### ALERT() breaks SETVALUE inside a change handler
`ALERT()` blocks execution; when the user dismisses it, Fulcrum re-renders the form from its backing state and overwrites any value `SETVALUE` set during the same event. Use `ALERT` only as a temporary diagnostic, and remove it before testing the real behavior.

### Reading a value you just set
`change` does not fire after `SETVALUE`, and a value written with `SETVALUE` is not reliably readable back via `$data_name` in the same handler. When a later step needs a computed value, pass it forward in a variable — don't re-read it from the field mid-handler.

### Hardcoded IDs
```javascript
// BAD — breaks when app is copied or moved between orgs
var TEMPLATE_ID = 'abc-123-def';

// GOOD — load records at runtime and match by a stable attribute (name)
LOADRECORDS({ form_id: FORM().id }, function(error, result) {
  var records = (Array.isArray(result) ? result : result.records) || [];
  // match by name/type, not a hardcoded ID
});
```
Hardcoded form IDs, report template IDs, or record IDs make apps non-portable. **Always discover resources at runtime** by querying by name, type, or relationship.

### Secrets in code
```javascript
// BAD — API keys visible to anyone who can view the data event
var API_KEY = 'sk_live_abc123';
REQUEST({ url: 'https://api.example.com/data?key=' + API_KEY }, handleResponse);

// REALITY — Fulcrum has no secrets management.
// If your data event needs an API key, the key will be in the code.
// Acknowledge this limitation and use the least-privileged key possible.
```
There is currently no secure way to store secrets in Fulcrum data events. This is a known platform gap. Mitigations: use read-only API keys, restrict key permissions to minimum scope, rotate keys regularly.

### Permission bypasses
Data events execute with the **record creator's context**, not the viewing user's context. This means:

- **Export bypass:** Data events can render data client-side and convert to CSV — bypassing platform export permissions
- **Bulk update bypass:** Data events can fire rapid API calls that bypass rate-limiting assumptions
- **Visibility vs data events conflict:** A field hidden by visibility rules is still accessible to data events

Design data events assuming they run in a **least-privilege context**. Do not use data events to implement security controls — use platform permissions.

### Unversioned CDN libraries
```javascript
// BAD — "latest" or unversioned URLs break without warning when the library updates
'<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>'
'<script src="https://cdnjs.cloudflare.com/ajax/libs/d3/latest/d3.min.js"></script>'

// GOOD — lock to a specific version
'<script src="https://cdn.jsdelivr.net/npm/chart.js@4.12.0"></script>'
'<script src="https://cdnjs.cloudflare.com/ajax/libs/d3/7.9.0/d3.min.js"></script>'
```
AI coding assistants love pulling in CDN libraries for charts, dashboards, and widgets. They often use `latest` or unversioned URLs. When the library pushes a breaking update, your tool stops working with no code change on your side. **Always lock CDN references to a specific semver version.** This applies to any external script or stylesheet loaded via CDN in data events, report templates, or app extensions.

### Monolithic scripts
A single `script` field holds ALL data events for a form. As complexity grows:
- Use clear function naming and section comments
- Group handlers by concern (validation, cascading, computation)
- Extract pure functions for testable logic
- If the script exceeds ~500 lines, the app likely needs decomposition (see `fulcrum-workflow-decomposition`)

## Platform Constraints

- **No server execution** — Data events run on-device. No persistent state between sessions.
- **No module imports** — No `require()`, no `import`. All code is a single script.
- **Callback-based async, no async/await** — `REQUEST()` (HTTP) and `LOADRECORDS()` are asynchronous and take a callback `(error, result)`. There is no `async`/`await` and no `fetch()`; `REQUEST()` is the HTTP primitive. `validate-record`, `validate-repeatable`, and `save-record` cannot perform async work.
- **Single script per form** — All event handlers share one script. Naming collisions are possible.
- **Mobile offline** — Data events must work offline. `fetch()` calls fail without connectivity. Design for offline-first, enhance when online.
- **No debugging tools** — No console, no breakpoints in production. Test in the web builder's preview mode.
- **CORS applies to REQUEST()** — When using `REQUEST()` from the web browser, the target API must support CORS or the request will fail. Mobile is not affected (no browser CORS restrictions on-device). If the target API doesn't support CORS, you need a middleware proxy (n8n, AWS Lambda, Google Apps Script, etc.) between Fulcrum and the API.

## Completion Criteria

- [ ] Field-change logic uses `ON('change', 'field', …)` — not `edit-record` (which fires once when an existing record opens)
- [ ] All field data_names verified against the live form — SETVALUE fails silently on a wrong name
- [ ] `LOADRECORDS()` / `REQUEST()` are treated as async (callback), not synchronous
- [ ] No hardcoded IDs — all resources discovered at runtime
- [ ] No secrets in code — or if unavoidable, documented and using least-privileged keys
- [ ] Data events do not implement security controls (use platform permissions)
- [ ] Offline behavior is considered — fetch() calls have fallback behavior
- [ ] Script is organized and readable — functions are named, concerns are grouped
- [ ] Any CDN library references use locked version numbers — no `latest` or unversioned URLs
- [ ] If using LOADRECORDS() or LOADFILE() — confirmed org is on Elite plan or Developer Pack
- [ ] If using REQUEST() on web — confirmed target API supports CORS or middleware proxy is in place
