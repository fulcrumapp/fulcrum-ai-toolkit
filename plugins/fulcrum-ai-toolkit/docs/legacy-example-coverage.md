# Legacy Example Coverage

This manifest accounts for every executable example in the legacy
product-knowledge artifact and for every fenced example that layer 4
externalized out of the distributable skills. It is a coverage record, not a
product specification.

Read it with
[`legacy-product-knowledge-coverage.md`](legacy-product-knowledge-coverage.md),
which governs the section-level migration and defines the source hierarchy.
This file governs code only.

> **Inventory fingerprint:** The legacy example inventory was taken from the
> user-supplied `legacy-product-knowledge-skill.md` artifact. No public URL was
> supplied for that artifact, and the original file is intentionally not
> committed. SHA-256:
> `274e73e1ea09910244821d809fa9b3427240d20b6f3b5133acb7c81b0912a7b5`.
>
> Verified against that digest, the artifact contains 16 fence markers, which
> is 8 fenced blocks, opening at lines 504, 533, 563, 625, 826, 868, 882, and
> 906. It also carries one unfenced executable unit — the numbered App MCP
> extension publish sequence — for a total of 9 legacy example units. The
> pre-audit estimate of 9 fenced blocks is reconciled here: the count is 8
> fenced plus 1 unfenced, not 9 fenced.

## Source rules for executable files

1. Every copied or materially adapted executable file carries a native
   `Source:` comment near the top: `// Source:` for JavaScript,
   `<!-- Source: -->` for HTML, `<%# Source: %>` for EJS, `/* Source: */` for
   CSS, and `-- Source:` for SQL.
2. Strict JSON cannot hold a comment. A JSON asset records its exact public
   source in the sibling `assets/README.md` index instead.
3. Public Fulcrum documentation, the public OpenAPI document, and public
   pricing are the sources for platform behavior. Live installed App MCP
   schemas govern connector tool names and arguments, and no private App MCP
   repository URL appears in a distributable file.
4. Placeholders are neutral. No identities, credentials, private URLs,
   repositories, infrastructure, roadmap claims, or unsupported enablement
   techniques appear in any example or asset.
5. SQL assets are read-only. They contain SELECT statements only and repeat the
   Query API's no-bind-parameter guidance.

## Dispositions

- `externalized`: the block moved to a file with equivalent content.
- `rewrite`: the block moved to a file whose content was corrected against
  current public documentation or the live App MCP contract.
- `merged`: the block duplicated another; both now point at one canonical file.
- `drop`: the block is not carried forward, with the reason recorded.
- `private`: the block belongs only in a separately controlled companion.
- `stale`: the block contradicts a current public source and was replaced.

## Legacy example units

| # | Legacy section and purpose | Disposition | Canonical target | Public source | Reason |
| --- | --- | --- | --- | --- | --- |
| L1 | App build sequence — optional field-type lookup call | `drop` | None; the step survives as prose and as step 1 of [`app-build-sequence.txt`](../skills/fulcrum-app-builder/assets/app-build-sequence.txt) | [Forms API introduction](https://docs.fulcrumapp.com/reference/forms-intro) | A single tool name is a connector contract, not an example. Live App MCP schemas govern it; freezing a call form adds no value. |
| L2 | App build sequence — build field, build form, create form flow | `rewrite` | [`app-build-sequence.txt`](../skills/fulcrum-app-builder/assets/app-build-sequence.txt) | [Forms API introduction](https://docs.fulcrumapp.com/reference/forms-intro) | Preserved as an ordered sequence, extended with validation and default Report Template behavior, and marked new-form-only so it cannot be mistaken for an update path. |
| L3 | Shared choice lists — create list, then reference by ID | `drop` | Choice-list guidance only, in [`app-build-sequence.txt`](../skills/fulcrum-app-builder/assets/app-build-sequence.txt) and [`fulcrum-app-builder`](../skills/fulcrum-app-builder/SKILL.md) | [Forms API introduction](https://docs.fulcrumapp.com/reference/forms-intro) | The legacy call form is outside the focused App MCP contract this package asserts. The durable point — a stored `value` may differ from a displayed `label`, and shared lists are referenced by ID — is kept as guidance, with the tool contract resolved from the live schema. |
| L4 | Data Events reference — knowledge categories to request | `rewrite` | [`data-events-reference-categories.txt`](../skills/fulcrum-data-events/assets/data-events-reference-categories.txt) | [Data Events reference](https://docs.fulcrumapp.com/docs/data-events-reference) | Kept as a lookup aid, annotated so the live schema stays authoritative, and corrected to separate calculation expressions from Data Event JavaScript. |
| L5 | Query API — sample rows from an app table | `externalized` | [`query-api-examples.sql`](../skills/fulcrum-query-api/assets/query-api-examples.sql) | [Query API introduction](https://docs.fulcrumapp.com/reference/query-intro) | Read-only SELECT; app-derived table names must be quoted. |
| L6 | Query API — join a repeatable table to its parent | `externalized` | [`query-api-examples.sql`](../skills/fulcrum-query-api/assets/query-api-examples.sql) | [Query API introduction](https://docs.fulcrumapp.com/reference/query-intro) | Read-only SELECT; current `_parent_id` and `_record_id` semantics retained. |
| L7 | Query API — PostGIS distance filter | `externalized` | [`query-api-examples.sql`](../skills/fulcrum-query-api/assets/query-api-examples.sql) | [Query API introduction](https://docs.fulcrumapp.com/reference/query-intro) | Read-only SELECT; hardcoded coordinates replaced with encoded-literal placeholders. |
| L8 | Reports — call the Query API from template EJS | `rewrite` | [`query-related-records.ejs`](../skills/fulcrum-report-building/examples/query-related-records.ejs) and [`report-queries.sql`](../skills/fulcrum-query-api/assets/report-queries.sql) | [Report Builder `QUERY()`](https://docs.fulcrumapp.com/docs/functions#query), [POST Query](https://docs.fulcrumapp.com/reference/query-post) | The legacy snippet interpolated a record value straight into SQL. The rewrite reads `record.formValues.find()`, encodes the value, bounds the result, and reads `rows`. |
| L9 | App Extensions via MCP — unfenced generate, upload, and attach sequence | `rewrite` | [`app-mcp-extension-publish-sequence.txt`](../skills/fulcrum-app-extensions/assets/app-mcp-extension-publish-sequence.txt) | [App Extensions introduction](https://docs.fulcrumapp.com/docs/app-extensions-introduction) | Preserved as an ordered sequence, extended with the read-before-update step so an existing form `script` is merged rather than overwritten, and labeled an automation path rather than a prerequisite. |

Legacy content that is not an executable example — positioning claims, private
infrastructure, roadmap statements, tenant procedures, and internal
inventories — is governed by
[`legacy-product-knowledge-coverage.md`](legacy-product-knowledge-coverage.md)
and stays out of this package.

## Externalized current blocks

Layer 4 removed all 49 fenced blocks from the distributable skills. No fenced
code block remains anywhere under `plugins/fulcrum-ai-toolkit/skills/`.

Every block carries a stable identifier, the source document it came from, and
its ordinal within that document. The identifier set, the source-and-ordinal
set, and the target set are all exact: `test/data/example-block-inventory.json`
records them independently, so adding, dropping, renumbering, or duplicating a
row fails the suite.

### fulcrum-data-events — 18 blocks

| ID | Source document | Block | Purpose | Disposition | Canonical target |
| --- | --- | --- | --- | --- | --- |
| C01 | `fulcrum-data-events/SKILL.md` | 1 | Set values on `change-status` | `externalized` | [`set-field-values-on-status-change.js`](../skills/fulcrum-data-events/examples/set-field-values-on-status-change.js) |
| C02 | `fulcrum-data-events/SKILL.md` | 2 | Conditional visibility with `SETHIDDEN()` | `rewrite` | [`conditional-visibility-sethidden.js`](../skills/fulcrum-data-events/examples/conditional-visibility-sethidden.js) |
| C03 | `fulcrum-data-events/SKILL.md` | 3 | Cascading choices with `SETCHOICES()` | `rewrite` | [`cascading-choices.js`](../skills/fulcrum-data-events/examples/cascading-choices.js) |
| C04 | `fulcrum-data-events/SKILL.md` | 4 | `LOADRECORDS()` callback contract | `externalized` | [`load-reference-records.js`](../skills/fulcrum-data-events/examples/load-reference-records.js) |
| C05 | `fulcrum-data-events/SKILL.md` | 5 | `LOADFILE()` shared helpers | `externalized` | [`loadfile-shared-helpers.js`](../skills/fulcrum-data-events/examples/loadfile-shared-helpers.js) |
| C06 | `fulcrum-data-events/SKILL.md` | 6 | `STORAGE()` session state | `rewrite` | [`storage-session-state.js`](../skills/fulcrum-data-events/examples/storage-session-state.js) |
| C07 | `fulcrum-data-events/SKILL.md` | 7 | Validate before save | `externalized` | [`validate-record-photo-required.js`](../skills/fulcrum-data-events/examples/validate-record-photo-required.js) |
| C08 | `fulcrum-data-events/SKILL.md` | 8 | Geometry trigger anti-pattern | `externalized` | [`geometry-trigger-guard.js`](../skills/fulcrum-data-events/examples/geometry-trigger-guard.js) |
| C09 | `fulcrum-data-events/SKILL.md` | 9 | Hardcoded field-list anti-pattern | `externalized` | [`field-names-bulk-readonly.js`](../skills/fulcrum-data-events/examples/field-names-bulk-readonly.js) |
| C10 | `fulcrum-data-events/SKILL.md` | 10 | Hardcoded identifier anti-pattern | `rewrite` | [`avoid-hardcoded-ids.js`](../skills/fulcrum-data-events/examples/avoid-hardcoded-ids.js) |
| C11 | `fulcrum-data-events/SKILL.md` | 11 | Secrets-in-code anti-pattern | `rewrite` | [`no-secrets-in-scripts.js`](../skills/fulcrum-data-events/examples/no-secrets-in-scripts.js) |
| C12 | `fulcrum-data-events/SKILL.md` | 12 | CDN version pinning | `externalized` | [`pin-cdn-library-versions.js`](../skills/fulcrum-data-events/examples/pin-cdn-library-versions.js) |
| C13 | `fulcrum-data-events/resources/data-event-examples.md` | 1 | Capture timestamp from a toggle | `externalized` | [`capture-timestamp-toggle.js`](../skills/fulcrum-data-events/examples/capture-timestamp-toggle.js) |
| C14 | `fulcrum-data-events/resources/data-event-examples.md` | 2 | Comment summary trail | `externalized` | [`comment-summary-audit-trail.js`](../skills/fulcrum-data-events/examples/comment-summary-audit-trail.js) |
| C15 | `fulcrum-data-events/resources/data-event-examples.md` | 3 | Sort repeatable children | `rewrite` | [`sort-repeatable-children.js`](../skills/fulcrum-data-events/examples/sort-repeatable-children.js) |
| C16 | `fulcrum-data-events/resources/data-event-examples.md` | 4 | Create repeatable entries | `rewrite` | [`create-repeatable-entries.js`](../skills/fulcrum-data-events/examples/create-repeatable-entries.js) |
| C17 | `fulcrum-data-events/resources/data-event-examples.md` | 5 | Record completeness validation | `externalized` | [`validate-record-completeness.js`](../skills/fulcrum-data-events/examples/validate-record-completeness.js) |
| C18 | `fulcrum-data-events/resources/data-event-examples.md` | 6 | Visibility via unsupported `SETFORMATTRIBUTES()` shape | `rewrite` | [`conditional-visibility-sethidden.js`](../skills/fulcrum-data-events/examples/conditional-visibility-sethidden.js) |

C02, C03, and C06 are rewrites because the originals registered no
initialization: a `change` handler alone leaves a dependent field's
visibility and a cascaded option list untouched when a record is opened,
and `STORAGE()` is device-wide, so an unscoped key carried one record's
baseline into the next. Each now applies an idempotent function on
`new-record`, on `edit-record`, and on change, and the storage example
scopes its key to the record and clears it on `cancel-record` and
`unload-record`. C10 and C11 are rewrites because the originals embedded a
literal-looking identifier and a credential-shaped string; both now use
neutral placeholders, and C11 adds the middleware alternative. C18 is a
rewrite because visibility now uses documented `SETHIDDEN()` rather than an
unsupported `SETFORMATTRIBUTES({ hidden: ... })` shape. C15 and C16
replaced in-place array mutation and spread syntax with non-mutating forms.

### fulcrum-app-extensions — 10 blocks

| ID | Source document | Block | Purpose | Disposition | Canonical target |
| --- | --- | --- | --- | --- | --- |
| C19 | `fulcrum-app-extensions/SKILL.md` | 1 | Complete extension HTML page | `rewrite` | [`species-picker.html`](../skills/fulcrum-app-extensions/examples/species-picker.html) |
| C20 | `fulcrum-app-extensions/SKILL.md` | 2 | `OPENEXTENSION` passing values in | `externalized` | [`open-extension-pass-values.js`](../skills/fulcrum-app-extensions/examples/open-extension-pass-values.js) |
| C21 | `fulcrum-app-extensions/SKILL.md` | 3 | `Fulcrum.load` reading the payload | `externalized` | [`extension-load-payload.js`](../skills/fulcrum-app-extensions/examples/extension-load-payload.js) |
| C22 | `fulcrum-app-extensions/SKILL.md` | 4 | `OPENEXTENSION` with `onMessage` write-back | `merged` | [`open-extension-pass-values.js`](../skills/fulcrum-app-extensions/examples/open-extension-pass-values.js) |
| C23 | `fulcrum-app-extensions/SKILL.md` | 5 | `Fulcrum.load` reading one context value | `merged` | [`extension-load-payload.js`](../skills/fulcrum-app-extensions/examples/extension-load-payload.js) |
| C24 | `fulcrum-app-extensions/SKILL.md` | 6 | Picker-pattern trigger | `externalized` | [`open-species-picker.js`](../skills/fulcrum-app-extensions/examples/open-species-picker.js) |
| C25 | `fulcrum-app-extensions/SKILL.md` | 7 | CDN version pinning in HTML | `externalized` | [`cdn-version-pinning.html`](../skills/fulcrum-app-extensions/assets/cdn-version-pinning.html) |
| C26 | `fulcrum-app-extensions/SKILL.md` | 8 | App MCP generate/upload/attach sequence | `rewrite` | [`app-mcp-extension-publish-sequence.txt`](../skills/fulcrum-app-extensions/assets/app-mcp-extension-publish-sequence.txt) |
| C27 | `fulcrum-app-extensions/resources/extension-bridge-api.md` | 1 | Minimal `OPENEXTENSION` trigger | `externalized` | [`open-extension-editor.js`](../skills/fulcrum-app-extensions/examples/open-extension-editor.js) |
| C28 | `fulcrum-app-extensions/resources/extension-bridge-api.md` | 2 | Load/finish lifecycle | `rewrite` | [`extension-bootstrap-lifecycle.js`](../skills/fulcrum-app-extensions/examples/extension-bootstrap-lifecycle.js) |

C22 and C23 were near-duplicates of the canonical trigger and payload files;
both call sites now link to one file. C19 is a rewrite: the page is named
`species-picker.html`, the single file name the publish sequence uploads and
the triggers open as `attachment://species-picker.html`, and its markup now
declares a document language and labels its control. C26 is a rewrite for
the read-before-update step; C28 adds explicit message and origin handling.

### fulcrum-report-building — 13 blocks

| ID | Source document | Block | Purpose | Disposition | Canonical target |
| --- | --- | --- | --- | --- | --- |
| C29 | `fulcrum-report-building/SKILL.md` | 1 | EJS tag types | `externalized` | [`ejs-tag-types.ejs`](../skills/fulcrum-report-building/assets/ejs-tag-types.ejs) |
| C30 | `fulcrum-report-building/SKILL.md` | 2 | Record field access | `externalized` | [`record-field-access.ejs`](../skills/fulcrum-report-building/examples/record-field-access.ejs) |
| C31 | `fulcrum-report-building/SKILL.md` | 3 | Repeatable iteration | `externalized` | [`repeatable-table-rows.ejs`](../skills/fulcrum-report-building/examples/repeatable-table-rows.ejs) |
| C32 | `fulcrum-report-building/SKILL.md` | 4 | Conditional block | `externalized` | [`conditional-section.ejs`](../skills/fulcrum-report-building/examples/conditional-section.ejs) |
| C33 | `fulcrum-report-building/SKILL.md` | 5 | `QUERY()` for related records | `rewrite` | [`query-related-records.ejs`](../skills/fulcrum-report-building/examples/query-related-records.ejs) |
| C34 | `fulcrum-report-building/SKILL.md` | 6 | `QUERY()` repeatable join | `rewrite` | [`query-repeatable-join.ejs`](../skills/fulcrum-report-building/examples/query-repeatable-join.ejs) |
| C35 | `fulcrum-report-building/SKILL.md` | 7 | `API()` for choice lists | `externalized` | [`api-fulcrum-rest.ejs`](../skills/fulcrum-report-building/examples/api-fulcrum-rest.ejs) |
| C36 | `fulcrum-report-building/SKILL.md` | 8 | `$params` date range | `rewrite` | [`params-date-range.ejs`](../skills/fulcrum-report-building/examples/params-date-range.ejs) |
| C37 | `fulcrum-report-building/SKILL.md` | 9 | HTML filter form | `externalized` | [`html-filter-form.ejs`](../skills/fulcrum-report-building/examples/html-filter-form.ejs) |
| C38 | `fulcrum-report-building/SKILL.md` | 10 | `API()` for forms, anti-pattern contrast | `merged` | [`api-fulcrum-rest.ejs`](../skills/fulcrum-report-building/examples/api-fulcrum-rest.ejs) |
| C39 | `fulcrum-report-building/SKILL.md` | 11 | `PHOTOURL()` signed image source | `externalized` | [`photo-url-signed-src.ejs`](../skills/fulcrum-report-building/examples/photo-url-signed-src.ejs) |
| C40 | `fulcrum-report-building/SKILL.md` | 12 | Sanitizing `$params` for SQL | `externalized` | [`sanitize-params-for-sql.ejs`](../skills/fulcrum-report-building/examples/sanitize-params-for-sql.ejs) |
| C41 | `fulcrum-report-building/resources/report-template-reference.md` | 1 | `QUERY()` rows iteration | `externalized` | [`query-rows-iteration.ejs`](../skills/fulcrum-report-building/examples/query-rows-iteration.ejs) |

C33 and C34 bound their result sets, select named columns, and encode the
interpolated record value. C36 is a rewrite because a shape test alone
accepted non-calendar dates such as `2024-02-31` and a reversed range, and
because `BETWEEN` dropped same-day readings after midnight on the end day;
it now round-trips each day through a real date and queries a half-open
interval. A print stylesheet,
[`report-print-layout.css`](../skills/fulcrum-report-building/assets/report-print-layout.css),
was added for the page-break and table-layout control that PDF output needs;
it is new material, sourced to the public reports introduction, not a
migrated block.

### fulcrum-app-design — 3 blocks

| ID | Source document | Block | Purpose | Disposition | Canonical target |
| --- | --- | --- | --- | --- | --- |
| C42 | `fulcrum-app-design/SKILL.md` | 1 | Calculation field expression forms | `externalized` | [`calculation-field-expressions.txt`](../skills/fulcrum-app-design/assets/calculation-field-expressions.txt) |
| C43 | `fulcrum-app-design/resources/field-type-reference.md` | 1 | Required-boolean 422 messages | `externalized` | [`required-boolean-errors.txt`](../skills/fulcrum-app-design/assets/required-boolean-errors.txt) |
| C44 | `fulcrum-app-design/resources/field-type-reference.md` | 2 | RecordLinkField element JSON | `rewrite` | [`record-link-field.json`](../skills/fulcrum-app-design/assets/record-link-field.json) |

C44 is a rewrite: the original element carried an `allow_multiple_records`
property that the public Forms schema does not define and omitted the
required common properties. It is now a complete element. It is strict JSON,
so its exact public source is recorded in
[`assets/README.md`](../skills/fulcrum-app-design/assets/README.md).

### fulcrum-app-builder, fulcrum-discovery, fulcrum-workflow-decomposition, fulcrum-solution-document — 5 blocks

| ID | Source document | Block | Purpose | Disposition | Canonical target |
| --- | --- | --- | --- | --- | --- |
| C45 | `fulcrum-app-builder/SKILL.md` | 1 | Preservation-safe form update call | `externalized` | [`forms-update-preserving-keys.js`](../skills/fulcrum-app-builder/examples/forms-update-preserving-keys.js) |
| C46 | `fulcrum-discovery/SKILL.md` | 1 | Discovery summary template | `externalized` | [`discovery-summary-template.md`](../skills/fulcrum-discovery/assets/discovery-summary-template.md) |
| C47 | `fulcrum-workflow-decomposition/SKILL.md` | 1 | Entity relationship map | `externalized` | [`entity-relationship-map.txt`](../skills/fulcrum-workflow-decomposition/assets/entity-relationship-map.txt) |
| C48 | `fulcrum-solution-document/SKILL.md` | 1 | Builder one-pager template | `externalized` | [`solution-one-pager-template.md`](../skills/fulcrum-solution-document/assets/solution-one-pager-template.md) |
| C49 | `fulcrum-solution-document/SKILL.md` | 2 | Chat and email share summary | `externalized` | [`solution-share-summary.txt`](../skills/fulcrum-solution-document/assets/solution-share-summary.txt) |

## Boundaries preserved

- The five-skill decomposition, the 16-skill inventory, and every host manifest
  are unchanged.
- The vendored OpenAPI snapshot and other heavy resources are retained; layer 4
  did not retire them.
- Source and guidance boundaries survive the move. A file that documents a
  toolkit convention says so, and a file that reproduces documented platform
  behavior links the documentation that establishes it.
