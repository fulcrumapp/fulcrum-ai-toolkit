---
name: fulcrum-data-events
description: Use when writing, reviewing, persisting, or debugging Fulcrum Data Event JavaScript. Defers current hooks and signatures to App MCP knowledge, stores the single script through form get/update operations, and covers patterns, constraints, lifecycle, offline behavior, and security.
---

A **data event** is JavaScript that runs inside a Fulcrum app in response to record lifecycle events. It executes on-device (mobile) and in-browser (web) — there is no server. Every data event shares a single `script` field on the form.

> **Guidance boundary:** Event names and function signatures in this skill follow Fulcrum's documented data-events API. Offline recommendations, security cautions, and workflow conventions are toolkit guidance unless explicitly sourced.

## App MCP Control Plane

When Fulcrum App MCP is registered, call `fulcrum_expressions_data_events_reference` for the current hook and function contract before authoring a script. The knowledge categories worth requesting are listed in
[`assets/data-events-reference-categories.txt`](assets/data-events-reference-categories.txt).
Treat the local runtime resources as an offline fallback, not as a replacement for the registered knowledge tool.

There are no standalone Data Event CRUD tools. Read the form and its current `script` with `fulcrum_forms_get`, compose the approved handler with the existing script, and write the complete script with `fulcrum_forms_update`. Do not overwrite unrelated handlers.

> Connector authority: Live installed App MCP schemas define the registered
> knowledge tool and form-script persistence contract.

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

Runnable snippets for every pattern below live in
[`examples/`](examples/README.md). Each file names its public source in a
`// Source:` comment. Merge a snippet into the form's existing script; never
replace unrelated handlers.

### Set field values
Stamp derived values on a lifecycle event with `SETVALUE()`:
[`examples/set-field-values-on-status-change.js`](examples/set-field-values-on-status-change.js).

### Conditional visibility
Hide a dependent field from a choice answer with `SETHIDDEN()`:
[`examples/conditional-visibility-sethidden.js`](examples/conditional-visibility-sethidden.js).
For field and section visibility, use the documented `SETHIDDEN()` pattern:
[`examples/conditional-visibility-sethidden.js`](examples/conditional-visibility-sethidden.js).
Neither is a security control. Register the rule on `new-record` and
`edit-record` as well as on `change`: default values fire no change event on a
new record, and reopening a saved record fires none either, so a change handler
alone leaves the dependent field at its designed visibility.

### Cascading choices
Narrow one choice field from another with `SETCHOICES()`:
[`examples/cascading-choices.js`](examples/cascading-choices.js). Apply the
filter on `new-record` and `edit-record` too, for the same reason: without it
the dependent field shows its full designed option list until the controlling
field is touched.

### Load reference data
`LOADRECORDS()` takes an options object and an asynchronous callback; it does not return records directly. See
[`examples/load-reference-records.js`](examples/load-reference-records.js).

> **Platform Requirement — Elite plan:** `LOADRECORDS()` and `LOADFILE()` require an Elite plan or Developer Pack. On Professional, only `REQUEST()` is available for external data. If you write `LOADRECORDS()` on a Professional org it silently fails — no error, no data.

### Share code across apps with LOADFILE
Store shared JavaScript in a Reference File, then load it into multiple apps at runtime. This is the standard code reuse pattern for builders maintaining several apps. See
[`examples/loadfile-shared-helpers.js`](examples/loadfile-shared-helpers.js).

> Source: [Fulcrum `LOADFILE()` reference](https://docs.fulcrumapp.com/docs/data-events-loadfile)

`LOADFILE()` takes an options object with required `name`, optional `form_name` or `form_id`, and optional `variable`, followed by an optional callback — `LOADFILE({ name, form_name | form_id, variable }, callback)`. For App MCP-managed files, use `fulcrum_reference_files_list` or `fulcrum_reference_files_get` to inspect the file and `fulcrum_reference_files_upload` to upload it before updating the form script.

> **Platform Requirement — Elite plan:** `LOADFILE()` requires Elite or Developer Pack. See note above.

### Session state with STORAGE
`STORAGE()` returns a local-storage-like object with `getItem`, `setItem`, `removeItem`, and `clear` methods. Values must be strings, so serialize objects with `JSON.stringify()`. The store is device-wide and persistent, so a bare key such as `baseline` is still there when the next record opens. Scope every key with `FORM().id` and the record it belongs to, and remove it on `cancel-record` and `unload-record`. `RECORDID()` is null until a new record has been saved, so it cannot separate one unsaved record from the next on its own: give an unsaved record a nonce generated once per editing session, so a session that crashed before its cleanup ran leaves a key the next session never computes. See
[`examples/storage-session-state.js`](examples/storage-session-state.js).

### Validate before save
`validate-record` is synchronous; call `INVALID('message')` to stop the save. See
[`examples/validate-record-photo-required.js`](examples/validate-record-photo-required.js)
for a single rule and
[`examples/validate-record-completeness.js`](examples/validate-record-completeness.js)
for several rules in one handler.

### Repeatable child entries
Sort child entries with
[`examples/sort-repeatable-children.js`](examples/sort-repeatable-children.js)
and append them with
[`examples/create-repeatable-entries.js`](examples/create-repeatable-entries.js).

### Timestamps and comment trails
See [`examples/capture-timestamp-toggle.js`](examples/capture-timestamp-toggle.js)
and [`examples/comment-summary-audit-trail.js`](examples/comment-summary-audit-trail.js).

## Anti-patterns

### Wrong data names
`SETVALUE('nonexistent_field', value)` can fail silently. Verify every data name against the live form before writing handlers.

### Reading a value immediately after setting it
Do not rely on a `SETVALUE()` call to trigger another `change` handler or on the field value being immediately readable through `$data_name` in the same handler. Pass computed values forward in local variables instead.

### Geometry-dependent triggers without a location check

Any trigger that needs the record's GPS location must guard against an empty geometry. A new record has no location until the user explicitly captures one. Compare the unsafe and guarded handlers in
[`examples/geometry-trigger-guard.js`](examples/geometry-trigger-guard.js).

**Events that have geometry available:** `change-geometry`, `edit-record` (if a location was previously saved), `validate-record` (if user has captured one).

**Events where geometry is often empty:** `new-record`, `load-record` (for new records).

> **Before writing any location-dependent logic, ask:** "Where does the GPS location come from, and when is it captured?" If the answer is "the user captures it in the field," use `change-geometry`. Never assume a new record has a location.

### Hardcoded field lists

Do not hardcode field name arrays when the platform provides dynamic alternatives. See
[`examples/field-names-bulk-readonly.js`](examples/field-names-bulk-readonly.js).

`FIELD_NAMES()` returns the data names of all fields in the current form scope. Inside a repeatable event, it returns fields within that repeatable. This is the correct approach for bulk read-only, bulk hide, or bulk clear operations.

### Hardcoded IDs
Compare a literal identifier with runtime discovery in
[`examples/avoid-hardcoded-ids.js`](examples/avoid-hardcoded-ids.js).
Hardcoded form IDs, report template IDs, or record IDs make apps non-portable. **Always discover resources at runtime** by querying by name, type, or relationship.

### Secrets in code
Data events execute where the user is, so anyone who can open the app configuration can read the script. See
[`examples/no-secrets-in-scripts.js`](examples/no-secrets-in-scripts.js).
There is currently no secure way to store secrets in Fulcrum data events. This is a known platform gap. Mitigations: move the credential behind a middleware endpoint, use read-only API keys, restrict key permissions to minimum scope, and rotate keys regularly.

### Permission bypasses
Data events execute with the **record creator's context**, not the viewing user's context. This means:

- **Export bypass:** Data events can render data client-side and convert to CSV — bypassing platform export permissions
- **Bulk update bypass:** Data events can fire rapid API calls that bypass rate-limiting assumptions
- **Visibility vs data events conflict:** A field hidden by visibility rules is still accessible to data events

Design data events assuming they run in a **least-privilege context**. Do not use data events to implement security controls — use platform permissions.

### Unversioned CDN libraries
Compare unversioned and pinned script references in
[`examples/pin-cdn-library-versions.js`](examples/pin-cdn-library-versions.js).
AI coding assistants love pulling in CDN libraries for charts, dashboards, and widgets. They often use `latest` or unversioned URLs. When the library pushes a breaking update, your tool stops working with no code change on your side. **Always lock CDN references to a specific semver version.** This applies to any external script or stylesheet loaded via CDN in data events, report templates, or app extensions.

### Monolithic scripts
A single `script` field holds ALL data events for a form. As complexity grows:
- Use clear function naming and section comments
- Group handlers by concern (validation, cascading, computation)
- Extract pure functions for testable logic
- If the script exceeds ~500 lines, the app likely needs decomposition (see `fulcrum-workflow-decomposition`)

## Built-in Expression Functions

Before writing custom JavaScript logic, call `fulcrum_expressions_list_functions` or `fulcrum_expressions_explain` when App MCP is available to check whether a Fulcrum built-in function already does it. The platform ships a large expression library covering geometry, strings, math, dates, and record operations.

**Commonly overlooked built-ins:**

| Task | Built-in | Instead of |
|------|----------|-----------|
| Get all field names | `FIELD_NAMES()` | Hardcoded array |
| Find nearest record by geometry | `GEOMETRY_NEAREST(records, point)` | Custom distance loop |
| Format a date | `FORMAT(date, 'YYYY-MM-DD')` | Manual string construction |
| User's full name | `USERFULLNAME()` | Custom user lookup |
| Current location | `LOCATION()` | Browser geolocation API |
| Field value by data name | `VALUE('field_name')` | Direct `$field_name` in dynamic contexts |
| Choice value (not label) | `CHOICEVALUE($field)` | String comparison on label |

> **Guidance:** If you find yourself writing more than 5–10 lines of JavaScript to solve a problem, check the registered App MCP expression knowledge first, then the public Fulcrum expressions reference if the tool is unavailable. A built-in function is more reliable, offline-safe, and maintainable than custom logic that reimplements it.

The full expressions reference is available in `resources/` as `expressions-reference.md` or via the Fulcrum documentation.

## Platform Constraints

- **No server execution** — Data events run on-device. Ordinary script state is
  ephemeral; `STORAGE()` is the explicit device-persistent exception and must
  use scoped keys with lifecycle cleanup.
- **No module imports** — No `require()`, no `import`. All code is a single script.
- **Callback-based async, no async/await** — `REQUEST()`, `LOADRECORDS()`, and callback-based `LOADFILE()` work asynchronously. `validate-record`, `validate-repeatable`, and `save-record` cannot perform asynchronous work.
- **Single script per form** — All event handlers share one script. Naming collisions are possible.
- **Mobile offline** — Data events must work offline. `REQUEST()` calls require connectivity and should have a graceful fallback or be limited to workflows that are explicitly online-only.
- **No debugging tools** — No console, no breakpoints in production. Test in the web builder's preview mode.
- **CORS applies to REQUEST()** — When using `REQUEST()` from the web browser, the target API must support CORS or the request will fail. Mobile is not affected (no browser CORS restrictions on-device). If the target API doesn't support CORS, you need a middleware proxy (n8n, AWS Lambda, Google Apps Script, etc.) between Fulcrum and the API.

## Completion Criteria

- [ ] Field-change logic listens on `ON('change', 'field', ...)` rather than treating `edit-record` as a change event, and any rule that must also hold when a record opens is applied from `new-record` and `edit-record` as well
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
- [ ] Any location-dependent trigger uses `change-geometry` and guards against empty geometry
- [ ] Bulk field operations use `FIELD_NAMES()` rather than hardcoded field name arrays
- [ ] Built-in expression functions checked before writing custom logic that might duplicate them
- [ ] When App MCP is available, current functions were checked with `fulcrum_expressions_data_events_reference` or the relevant expression knowledge tool
- [ ] The form's existing `script` was fetched and preserved before `fulcrum_forms_update`

## References

- [Fulcrum data events reference](https://docs.fulcrumapp.com/docs/data-events-reference)
- [Fulcrum `LOADFILE()` reference](https://docs.fulcrumapp.com/docs/data-events-loadfile)
- [Fulcrum `REQUEST()` reference](https://docs.fulcrumapp.com/docs/data-events-request)
- [Fulcrum `STORAGE()` reference](https://docs.fulcrumapp.com/docs/data-events-storage)
- [Runnable example index](examples/README.md)
- [Example catalog by pattern](resources/data-event-examples.md)
- [Agent Skills specification](https://agentskills.io/specification)
