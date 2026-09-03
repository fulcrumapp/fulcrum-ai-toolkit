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

### fulcrum-data-events — 18 blocks

| Source document | Block purpose | Disposition | Canonical target |
| --- | --- | --- | --- |
| `SKILL.md` | Set values on `change-status` | `externalized` | [`set-field-values-on-status-change.js`](../skills/fulcrum-data-events/examples/set-field-values-on-status-change.js) |
| `SKILL.md` | Conditional visibility with `SETHIDDEN()` | `externalized` | [`conditional-visibility-sethidden.js`](../skills/fulcrum-data-events/examples/conditional-visibility-sethidden.js) |
| `SKILL.md` | Cascading choices with `SETCHOICES()` | `externalized` | [`cascading-choices.js`](../skills/fulcrum-data-events/examples/cascading-choices.js) |
| `SKILL.md` | `LOADRECORDS()` callback contract | `externalized` | [`load-reference-records.js`](../skills/fulcrum-data-events/examples/load-reference-records.js) |
| `SKILL.md` | `LOADFILE()` shared helpers | `externalized` | [`loadfile-shared-helpers.js`](../skills/fulcrum-data-events/examples/loadfile-shared-helpers.js) |
| `SKILL.md` | `STORAGE()` session state | `externalized` | [`storage-session-state.js`](../skills/fulcrum-data-events/examples/storage-session-state.js) |
| `SKILL.md` | Validate before save | `externalized` | [`validate-record-photo-required.js`](../skills/fulcrum-data-events/examples/validate-record-photo-required.js) |
| `SKILL.md` | Geometry trigger anti-pattern | `externalized` | [`geometry-trigger-guard.js`](../skills/fulcrum-data-events/examples/geometry-trigger-guard.js) |
| `SKILL.md` | Hardcoded field-list anti-pattern | `externalized` | [`field-names-bulk-readonly.js`](../skills/fulcrum-data-events/examples/field-names-bulk-readonly.js) |
| `SKILL.md` | Hardcoded identifier anti-pattern | `rewrite` | [`avoid-hardcoded-ids.js`](../skills/fulcrum-data-events/examples/avoid-hardcoded-ids.js) |
| `SKILL.md` | Secrets-in-code anti-pattern | `rewrite` | [`no-secrets-in-scripts.js`](../skills/fulcrum-data-events/examples/no-secrets-in-scripts.js) |
| `SKILL.md` | CDN version pinning | `externalized` | [`pin-cdn-library-versions.js`](../skills/fulcrum-data-events/examples/pin-cdn-library-versions.js) |
| `resources/data-event-examples.md` | Capture timestamp from a toggle | `externalized` | [`capture-timestamp-toggle.js`](../skills/fulcrum-data-events/examples/capture-timestamp-toggle.js) |
| `resources/data-event-examples.md` | Comment summary trail | `externalized` | [`comment-summary-audit-trail.js`](../skills/fulcrum-data-events/examples/comment-summary-audit-trail.js) |
| `resources/data-event-examples.md` | Sort repeatable children | `rewrite` | [`sort-repeatable-children.js`](../skills/fulcrum-data-events/examples/sort-repeatable-children.js) |
| `resources/data-event-examples.md` | Create repeatable entries | `rewrite` | [`create-repeatable-entries.js`](../skills/fulcrum-data-events/examples/create-repeatable-entries.js) |
| `resources/data-event-examples.md` | Record completeness validation | `externalized` | [`validate-record-completeness.js`](../skills/fulcrum-data-events/examples/validate-record-completeness.js) |
| `resources/data-event-examples.md` | Visibility via unsupported `SETFORMATTRIBUTES()` shape | `rewrite` | [`conditional-visibility-sethidden.js`](../skills/fulcrum-data-events/examples/conditional-visibility-sethidden.js) |

`avoid-hardcoded-ids.js`, `no-secrets-in-scripts.js`, and the visibility row are
rewrites because the
originals embedded a literal-looking identifier and a credential-shaped string;
the first two now use neutral placeholders, the secrets file adds the middleware
alternative, and visibility now uses documented `SETHIDDEN()` rather than an
unsupported `SETFORMATTRIBUTES({ hidden: ... })` shape.
`sort-repeatable-children.js` and `create-repeatable-entries.js`
replaced in-place array mutation and spread syntax with non-mutating forms.

### fulcrum-app-extensions — 10 blocks

| Source document | Block purpose | Disposition | Canonical target |
| --- | --- | --- | --- |
| `SKILL.md` | Complete extension HTML page | `externalized` | [`species-picker-extension.html`](../skills/fulcrum-app-extensions/examples/species-picker-extension.html) |
| `SKILL.md` | `OPENEXTENSION` passing values in | `externalized` | [`open-extension-pass-values.js`](../skills/fulcrum-app-extensions/examples/open-extension-pass-values.js) |
| `SKILL.md` | `Fulcrum.load` reading the payload | `externalized` | [`extension-load-payload.js`](../skills/fulcrum-app-extensions/examples/extension-load-payload.js) |
| `SKILL.md` | `OPENEXTENSION` with `onMessage` write-back | `merged` | [`open-extension-pass-values.js`](../skills/fulcrum-app-extensions/examples/open-extension-pass-values.js) |
| `SKILL.md` | `Fulcrum.load` reading one context value | `merged` | [`extension-load-payload.js`](../skills/fulcrum-app-extensions/examples/extension-load-payload.js) |
| `SKILL.md` | Picker-pattern trigger | `externalized` | [`open-species-picker.js`](../skills/fulcrum-app-extensions/examples/open-species-picker.js) |
| `SKILL.md` | CDN version pinning in HTML | `externalized` | [`cdn-version-pinning.html`](../skills/fulcrum-app-extensions/assets/cdn-version-pinning.html) |
| `SKILL.md` | App MCP generate/upload/attach sequence | `rewrite` | [`app-mcp-extension-publish-sequence.txt`](../skills/fulcrum-app-extensions/assets/app-mcp-extension-publish-sequence.txt) |
| `resources/extension-bridge-api.md` | Minimal `OPENEXTENSION` trigger | `externalized` | [`open-extension-editor.js`](../skills/fulcrum-app-extensions/examples/open-extension-editor.js) |
| `resources/extension-bridge-api.md` | Load/finish lifecycle | `rewrite` | [`extension-bootstrap-lifecycle.js`](../skills/fulcrum-app-extensions/examples/extension-bootstrap-lifecycle.js) |

The two `merged` rows were near-duplicates of the canonical trigger and payload
files; both call sites now link to one file. `extension-bootstrap-lifecycle.js`
adds explicit message and origin handling.

### fulcrum-report-building — 13 blocks

| Source document | Block purpose | Disposition | Canonical target |
| --- | --- | --- | --- |
| `SKILL.md` | EJS tag types | `externalized` | [`ejs-tag-types.ejs`](../skills/fulcrum-report-building/assets/ejs-tag-types.ejs) |
| `SKILL.md` | Record field access | `externalized` | [`record-field-access.ejs`](../skills/fulcrum-report-building/examples/record-field-access.ejs) |
| `SKILL.md` | Repeatable iteration | `externalized` | [`repeatable-table-rows.ejs`](../skills/fulcrum-report-building/examples/repeatable-table-rows.ejs) |
| `SKILL.md` | Conditional block | `externalized` | [`conditional-section.ejs`](../skills/fulcrum-report-building/examples/conditional-section.ejs) |
| `SKILL.md` | `QUERY()` for related records | `rewrite` | [`query-related-records.ejs`](../skills/fulcrum-report-building/examples/query-related-records.ejs) |
| `SKILL.md` | `QUERY()` repeatable join | `rewrite` | [`query-repeatable-join.ejs`](../skills/fulcrum-report-building/examples/query-repeatable-join.ejs) |
| `SKILL.md` | `API()` for choice lists | `externalized` | [`api-fulcrum-rest.ejs`](../skills/fulcrum-report-building/examples/api-fulcrum-rest.ejs) |
| `SKILL.md` | `$params` date range | `externalized` | [`params-date-range.ejs`](../skills/fulcrum-report-building/examples/params-date-range.ejs) |
| `SKILL.md` | HTML filter form | `externalized` | [`html-filter-form.ejs`](../skills/fulcrum-report-building/examples/html-filter-form.ejs) |
| `SKILL.md` | `API()` for forms, anti-pattern contrast | `merged` | [`api-fulcrum-rest.ejs`](../skills/fulcrum-report-building/examples/api-fulcrum-rest.ejs) |
| `SKILL.md` | `PHOTOURL()` signed image source | `externalized` | [`photo-url-signed-src.ejs`](../skills/fulcrum-report-building/examples/photo-url-signed-src.ejs) |
| `SKILL.md` | Sanitizing `$params` for SQL | `externalized` | [`sanitize-params-for-sql.ejs`](../skills/fulcrum-report-building/examples/sanitize-params-for-sql.ejs) |
| `resources/report-template-reference.md` | `QUERY()` rows iteration | `externalized` | [`query-rows-iteration.ejs`](../skills/fulcrum-report-building/examples/query-rows-iteration.ejs) |

The two `QUERY()` rewrites bound their result sets, select named columns, and
encode the interpolated record value. A print stylesheet,
[`report-print-layout.css`](../skills/fulcrum-report-building/assets/report-print-layout.css),
was added for the page-break and table-layout control that PDF output needs;
it is new material, sourced to the public reports introduction, not a migrated
block.

### fulcrum-app-design — 3 blocks

| Source document | Block purpose | Disposition | Canonical target |
| --- | --- | --- | --- |
| `SKILL.md` | Calculation field expression forms | `externalized` | [`calculation-field-expressions.txt`](../skills/fulcrum-app-design/assets/calculation-field-expressions.txt) |
| `resources/field-type-reference.md` | Required-boolean 422 messages | `externalized` | [`required-boolean-errors.txt`](../skills/fulcrum-app-design/assets/required-boolean-errors.txt) |
| `resources/field-type-reference.md` | RecordLinkField element JSON | `externalized` | [`record-link-field.json`](../skills/fulcrum-app-design/assets/record-link-field.json) |

`record-link-field.json` is strict JSON, so its exact public source is recorded
in [`assets/README.md`](../skills/fulcrum-app-design/assets/README.md).

### fulcrum-app-builder, fulcrum-discovery, fulcrum-workflow-decomposition, fulcrum-solution-document — 5 blocks

| Source document | Block purpose | Disposition | Canonical target |
| --- | --- | --- | --- |
| `fulcrum-app-builder/SKILL.md` | Preservation-safe form update call | `externalized` | [`forms-update-preserving-keys.js`](../skills/fulcrum-app-builder/examples/forms-update-preserving-keys.js) |
| `fulcrum-discovery/SKILL.md` | Discovery summary template | `externalized` | [`discovery-summary-template.md`](../skills/fulcrum-discovery/assets/discovery-summary-template.md) |
| `fulcrum-workflow-decomposition/SKILL.md` | Entity relationship map | `externalized` | [`entity-relationship-map.txt`](../skills/fulcrum-workflow-decomposition/assets/entity-relationship-map.txt) |
| `fulcrum-solution-document/SKILL.md` | Builder one-pager template | `externalized` | [`solution-one-pager-template.md`](../skills/fulcrum-solution-document/assets/solution-one-pager-template.md) |
| `fulcrum-solution-document/SKILL.md` | Chat and email share summary | `externalized` | [`solution-share-summary.txt`](../skills/fulcrum-solution-document/assets/solution-share-summary.txt) |

## Boundaries preserved

- The five-skill decomposition, the 16-skill inventory, and every host manifest
  are unchanged.
- The vendored OpenAPI snapshot and other heavy resources are retained; layer 4
  did not retire them.
- Source and guidance boundaries survive the move. A file that documents a
  toolkit convention says so, and a file that reproduces documented platform
  behavior links the documentation that establishes it.
