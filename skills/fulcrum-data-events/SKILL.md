---
name: fulcrum-data-events
description: Use when writing, reviewing, or debugging Fulcrum data events (JavaScript). Covers patterns, anti-patterns, platform constraints, event lifecycle, and security. Also use when a builder asks about automating behavior in a Fulcrum app.
---

A **data event** is JavaScript that runs inside a Fulcrum app in response to record lifecycle events. It executes on-device (mobile) and in-browser (web) — there is no server. Every data event shares a single `script` field on the form.

## Event Lifecycle

Data events fire on these events:

| Event | When it fires | Common uses |
|-------|--------------|-------------|
| `load-record` | Record opens (new or existing) | Set defaults, load reference data, show/hide fields |
| `edit-record` | Field value changes | Cascade choices, validate, compute, show/hide |
| `validate-record` | User taps Save | Block save with validation errors |
| `save-record` | After successful save | Set status, update timestamps |
| `load-repeatable` | Repeatable item opens | Set repeatable defaults |
| `edit-repeatable` | Repeatable field changes | Validate repeatable items |
| `validate-repeatable` | Repeatable item saved | Block repeatable save |
| `save-repeatable` | After repeatable save | Aggregate repeatable data to parent |
| `new-repeatable` | New repeatable item created | Auto-number, set sequence |
| `remove-repeatable` | Repeatable item deleted | Recalculate aggregates |

## Core Patterns

### Set field values
```javascript
ON('edit-record', function(event) {
  if (event.field === 'status') {
    SETVALUE('status_date', new Date());
    SETVALUE('status_by', USERFULLNAME());
  }
});
```

### Conditional visibility
```javascript
ON('edit-record', function(event) {
  SETHIDDEN('permit_number', CHOICEVALUE($permit_required) !== 'Yes');
});
```

### Cascading choices
```javascript
ON('edit-record', function(event) {
  if (event.field === 'state') {
    var counties = COUNTIES_BY_STATE[CHOICEVALUE($state)];
    SETCHOICES('county', counties || []);
  }
});
```

### Load reference data
```javascript
ON('load-record', function(event) {
  var records = LOADRECORDS('lookup_app_id', 'record_link_field');
  // Use loaded records to populate choices or validate
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

### Hardcoded IDs
```javascript
// BAD — breaks when app is copied or moved between orgs
var TEMPLATE_ID = 'abc-123-def';

// GOOD — discover at runtime
var templates = LOADRECORDS('', 'form_id_field');
```
Hardcoded form IDs, report template IDs, or record IDs make apps non-portable. **Always discover resources at runtime** by querying by name, type, or relationship.

### Secrets in code
```javascript
// BAD — API keys visible to anyone who can view the data event
var API_KEY = 'sk_live_abc123';
fetch('https://api.example.com/data?key=' + API_KEY);

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
- **No async/await** — `LOADRECORDS()` is synchronous. `fetch()` is available but blocks the UI.
- **Single script per form** — All event handlers share one script. Naming collisions are possible.
- **Mobile offline** — Data events must work offline. `fetch()` calls fail without connectivity. Design for offline-first, enhance when online.
- **No debugging tools** — No console, no breakpoints in production. Test in the web builder's preview mode.

## Completion Criteria

- [ ] Data events handle the correct lifecycle events (not load-record when edit-record is needed)
- [ ] No hardcoded IDs — all resources discovered at runtime
- [ ] No secrets in code — or if unavoidable, documented and using least-privileged keys
- [ ] Data events do not implement security controls (use platform permissions)
- [ ] Offline behavior is considered — fetch() calls have fallback behavior
- [ ] Script is organized and readable — functions are named, concerns are grouped
- [ ] Any CDN library references use locked version numbers — no `latest` or unversioned URLs
