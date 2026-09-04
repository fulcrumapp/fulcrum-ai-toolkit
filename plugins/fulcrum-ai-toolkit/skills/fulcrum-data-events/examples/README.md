# Data Event Examples Index

Runnable reference snippets for the single `script` value on a Fulcrum form.
Every file carries a `// Source:` comment naming its public documentation.

Compose these with the form's existing script rather than replacing it: read
the current script with `fulcrum_forms_get`, merge, then write the complete
script with `fulcrum_forms_update`.

## Event handlers

| File | What it does |
| --- | --- |
| [`set-field-values-on-status-change.js`](set-field-values-on-status-change.js) | Stamps status date and user on `change-status`. |
| [`capture-timestamp-toggle.js`](capture-timestamp-toggle.js) | Writes a formatted time from a choice toggle. |
| [`comment-summary-audit-trail.js`](comment-summary-audit-trail.js) | Appends a timestamped comment trail on `save-record`. |

## Field and repeatable listeners

| File | What it does |
| --- | --- |
| [`cascading-choices.js`](cascading-choices.js) | Narrows one choice field from another with `SETCHOICES()`, applied on `new-record`, `edit-record`, and change. |
| [`sort-repeatable-children.js`](sort-repeatable-children.js) | Orders repeatable child entries by a numeric child field. |
| [`create-repeatable-entries.js`](create-repeatable-entries.js) | Appends a repeatable child entry from a hyperlink `click`. |

## Validation

| File | What it does |
| --- | --- |
| [`validate-record-photo-required.js`](validate-record-photo-required.js) | Blocks save until a photo exists. |
| [`validate-record-completeness.js`](validate-record-completeness.js) | Enforces signature and photo-count rules with `INVALID()`. |

## Visibility

| File | What it does |
| --- | --- |
| [`conditional-visibility-sethidden.js`](conditional-visibility-sethidden.js) | Shows a dependent field with `SETHIDDEN()`, applied on `new-record`, `edit-record`, and change. |

## Calculation

Calculation fields use Fulcrum expression syntax, not Data Event JavaScript.
See [`calculation-field-expressions.txt`](../../fulcrum-app-design/assets/calculation-field-expressions.txt)
in `fulcrum-app-design`. Use a `change` handler plus `SETVALUE()`, as in
[`set-field-values-on-status-change.js`](set-field-values-on-status-change.js),
when the logic is too complex for an expression.

## Data loading and shared code

| File | What it does |
| --- | --- |
| [`load-reference-records.js`](load-reference-records.js) | Reads reference records with the `LOADRECORDS()` callback API. |
| [`loadfile-shared-helpers.js`](loadfile-shared-helpers.js) | Loads a shared helper Reference File with `LOADFILE()`. |
| [`storage-session-state.js`](storage-session-state.js) | Caches a derived value with `STORAGE()` under a key scoped to the app and to the record — or, for an unsaved record, to the editing session — cleared on the record lifecycle exits. |

## Anti-pattern contrasts

| File | What it shows |
| --- | --- |
| [`geometry-trigger-guard.js`](geometry-trigger-guard.js) | Why location logic belongs on `change-geometry`. |
| [`field-names-bulk-readonly.js`](field-names-bulk-readonly.js) | `FIELD_NAMES()` instead of a hardcoded field list. |
| [`avoid-hardcoded-ids.js`](avoid-hardcoded-ids.js) | Runtime discovery instead of literal identifiers. |
| [`no-secrets-in-scripts.js`](no-secrets-in-scripts.js) | Why a credential must not live in a client-side script. |
| [`pin-cdn-library-versions.js`](pin-cdn-library-versions.js) | Exact semver pinning for external script references. |

## Assets

| File | What it holds |
| --- | --- |
| [`data-events-reference-categories.txt`](../assets/data-events-reference-categories.txt) | Knowledge categories to request before authoring a script. |
