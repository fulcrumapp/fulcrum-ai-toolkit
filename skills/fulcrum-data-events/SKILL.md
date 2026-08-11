---
name: fulcrum-data-events
description: Use when writing, reviewing, or debugging Fulcrum data events (JavaScript). Covers patterns, anti-patterns, platform constraints, event lifecycle, and security. Also use when a builder asks about automating behavior in a Fulcrum app.
---

A **data event** is JavaScript that runs inside a Fulcrum app in response to record lifecycle events. It executes on-device (mobile) and in-browser (web) — there is no server. Every data event shares a single `script` field on the form.

> **Provenance:** Event names and function signatures in this skill follow Fulcrum's documented data-events API. Offline recommendations, security cautions, and workflow conventions are toolkit guidance unless explicitly attributed.

## Event Lifecycle

Fulcrum has several event families. The event family matters: `edit-record` is not a field-change event.

**Record events** — record lifecycle moments:

| Event | When it fires |
|-------|--------------|
| `load-record` | Record editor opens, for new and existing records |
| `new-record` | A new record is created, after `load-record` |
| `edit-record` | An existing record is opened, after `load-record`; it does not fire for every field change |
| `validate-record` | Right before save; use `INVALID('message')` for synchronous validation |
| `save-record` | Immediately before save, after validation; asynchronous work is not supported |
| `change-status` | Status changes; not for defaults or `SETSTATUS()` |
| `change-geometry` | Location changes; not for `SETLOCATION()` or `SETGEOMETRY()` |

**Field events** — pass the field data name as the second argument:

| Event | When it fires |
|-------|--------------|
| `change` | A field value changes, including calculated fields |
| `click` | A hyperlink field is tapped |
| `focus` / `blur` | A text or numeric field gains or loses focus |

**Repeatable events** — pass the repeatable field data name as the second argument: `load-repeatable`, `new-repeatable`, `edit-repeatable`, `validate-repeatable`, `save-repeatable`, `remove-repeatable`, and `change-geometry`.

`change` does not fire after `SETVALUE()`. It can fire for calculated fields that change as a result of `SETVALUE()` or other programmatic updates.

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
`LOADRECORDS()` takes an options object and an asynchronous callback; it does not return records directly.
```javascript
ON('load-record', function(event) {
  LOADRECORDS({
    form_id: FORM().id,
    limit: 200
  }, function(error, result) {
    if (error) {
      return;
    }
    var records = result.records;
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
`STORAGE()` returns a local-storage-like object with `getItem`, `setItem`, `removeItem`, and `clear` methods. Values must be strings, so serialize objects with `JSON.stringify()`.

```javascript
ON('load-record', function(event) {
  var storage = STORAGE();
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

## Anti-patterns

### Wrong data names
`SETVALUE('nonexistent_field', value)` can fail silently. Verify every data name against the live form before writing handlers.

### Reading a value immediately after setting it
Do not rely on a `SETVALUE()` call to trigger another `change` handler or on the field value being immediately readable through `$data_name` in the same handler. Pass computed values forward in local variables instead.

### Hardcoded IDs
```javascript
// BAD — breaks when app is copied or moved between orgs
var TEMPLATE_ID = 'abc-123-def';

// GOOD — load records at runtime and match by a stable attribute
LOADRECORDS({ form_id: FORM().id }, function(error, result) {
  var templates = error ? [] : result.records;
  // Match by name or type, not a hardcoded ID.
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
- **Callback-based async, no async/await** — `REQUEST()` and `LOADRECORDS()` are asynchronous and take callbacks. `validate-record`, `validate-repeatable`, and `save-record` cannot perform asynchronous work.
- **Single script per form** — All event handlers share one script. Naming collisions are possible.
- **Mobile offline** — Data events must work offline. `REQUEST()` calls require connectivity and should have a graceful fallback or be limited to workflows that are explicitly online-only.
- **No debugging tools** — No console, no breakpoints in production. Test in the web builder's preview mode.
- **CORS applies to REQUEST()** — When using `REQUEST()` from the web browser, the target API must support CORS or the request will fail. Mobile is not affected (no browser CORS restrictions on-device). If the target API doesn't support CORS, you need a middleware proxy (n8n, AWS Lambda, Google Apps Script, etc.) between Fulcrum and the API.

## Completion Criteria

- [ ] Field-change logic uses `ON('change', 'field', ...)`, not `edit-record`
- [ ] All field data names are verified against the live form — wrong names can fail silently
- [ ] `LOADRECORDS()` and `REQUEST()` are treated as asynchronous callback APIs
- [ ] No hardcoded IDs — all resources discovered at runtime
- [ ] No secrets in code — or if unavoidable, documented and using least-privileged keys
- [ ] Data events do not implement security controls (use platform permissions)
- [ ] Offline behavior is considered — `REQUEST()` calls have a fallback or an explicit online-only workflow
- [ ] Script is organized and readable — functions are named, concerns are grouped
- [ ] Any CDN library references use locked version numbers — no `latest` or unversioned URLs
- [ ] If using LOADRECORDS() or LOADFILE() — confirmed org is on Elite plan or Developer Pack
- [ ] If using REQUEST() on web — confirmed target API supports CORS or middleware proxy is in place
