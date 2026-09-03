# Data Event Examples

> Source: https://docs.fulcrumapp.com/docs/data-events-reference.md
> Verified: 2026-09-02

Every runnable snippet lives in [`../examples/`](../examples/README.md) as a
separate `.js` file so it can be linted, diffed, and pasted without extracting
it from prose. Each file carries a `// Source:` comment naming its public
documentation.

## Index

| Pattern | File |
| --- | --- |
| Capture a timestamp from a Yes/No toggle | [`capture-timestamp-toggle.js`](../examples/capture-timestamp-toggle.js) |
| Accumulate a comment trail across edits | [`comment-summary-audit-trail.js`](../examples/comment-summary-audit-trail.js) |
| Sort repeatable child entries | [`sort-repeatable-children.js`](../examples/sort-repeatable-children.js) |
| Create repeatable entries programmatically | [`create-repeatable-entries.js`](../examples/create-repeatable-entries.js) |
| Enforce completeness before save | [`validate-record-completeness.js`](../examples/validate-record-completeness.js) |
| Toggle field or section visibility with `SETHIDDEN()` | [`conditional-visibility-sethidden.js`](../examples/conditional-visibility-sethidden.js) |
| Stamp values on `change-status` | [`set-field-values-on-status-change.js`](../examples/set-field-values-on-status-change.js) |
| Hide a field with `SETHIDDEN()` | [`conditional-visibility-sethidden.js`](../examples/conditional-visibility-sethidden.js) |
| Cascade choices with `SETCHOICES()` | [`cascading-choices.js`](../examples/cascading-choices.js) |
| Load reference records asynchronously | [`load-reference-records.js`](../examples/load-reference-records.js) |
| Share helpers across apps with `LOADFILE()` | [`loadfile-shared-helpers.js`](../examples/loadfile-shared-helpers.js) |
| Cache session state with `STORAGE()` | [`storage-session-state.js`](../examples/storage-session-state.js) |
| Require a photo before save | [`validate-record-photo-required.js`](../examples/validate-record-photo-required.js) |
| Guard location-dependent triggers | [`geometry-trigger-guard.js`](../examples/geometry-trigger-guard.js) |
| Replace hardcoded field lists | [`field-names-bulk-readonly.js`](../examples/field-names-bulk-readonly.js) |
| Replace hardcoded identifiers | [`avoid-hardcoded-ids.js`](../examples/avoid-hardcoded-ids.js) |
| Keep credentials out of scripts | [`no-secrets-in-scripts.js`](../examples/no-secrets-in-scripts.js) |
| Pin external script versions | [`pin-cdn-library-versions.js`](../examples/pin-cdn-library-versions.js) |

## Usage Notes

- A form holds one `script` value. Merge a snippet into the existing script
  instead of replacing it.
- Repeatable entries must be saved before their child records can be edited.
- `LOADRECORDS()` and `LOADFILE()` require an Elite plan or Developer Pack.
- Nothing in these files is a security control. Use platform permissions for
  authorization and never embed a credential.
