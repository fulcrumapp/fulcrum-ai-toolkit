---
name: fulcrum-report-building
description: Use when building, modifying, generating, or debugging Fulcrum reports and Report Templates. Covers the documented Report Builder runtime, App MCP template CRUD and report generation, EJS patterns, context objects, QUERY() for multi-record reports, and common mistakes.
---

A Fulcrum **report template** is EJS (Embedded JavaScript) that runs server-side inside a headless Chrome instance (Puppeteer). The output is a PDF or HTML page — not a live view. Every report starts from a single record's context and expands from there via `QUERY()`.

> **Guidance boundary:** Report APIs and template behavior should be checked against current Fulcrum documentation. The rendering workflow below is a toolkit convention, not a guarantee of public product support.

## App MCP Control Plane

When Fulcrum App MCP is registered, use its live schemas for Report Template management and report generation:

| Goal | App MCP tool |
|---|---|
| List templates, optionally by form | `fulcrum_report_templates_list` |
| Read a template | `fulcrum_report_templates_get` |
| Create a Report Builder template | `fulcrum_report_templates_create` |
| Update a template | `fulcrum_report_templates_update` |
| Delete a template after confirmation | `fulcrum_report_templates_delete` |
| Generate a report for a record | `fulcrum_reports_create` |

`fulcrum_reports_create` requires `record_id` and accepts optional `template_id`. App MCP does not provide record CRUD, Query API execution, or media CRUD; obtain record IDs through an authorized interface and use the Report Builder's documented runtime functions only inside template EJS.

`fulcrum_forms_create` creates a default Report Template unless `skip_default_report` is explicitly `true`. If form creation returns a form plus `report_template_error`, the form succeeded and only template creation failed. Do not create the form again; use `fulcrum_report_templates_create` for the missing template.

> Connector authority: Live installed App MCP schemas define registered report
> tools and result shapes. Runtime names come from the
> [Fulcrum Report Builder functions reference](https://docs.fulcrumapp.com/docs/functions).

## Report Types

### Standard PDF
Pre-built generic output with toggle controls (header, footer, cover page, field visibility, map). No coding required. Limited customization — customers often discover it can't produce the pixel-perfect output they need.

### Advanced report (PDF or HTML)
Unlocks the full EJS code behind the standard report. You can modify the standard template or build from scratch. **This is where report building happens.**

To switch to HTML output, set the Report Template output to HTML through the supported template settings.

## Core Context Objects

These are available in every report without any setup:

| Object/Function | What it gives you |
|----------------|-------------------|
| `record` | The current record — metadata plus field values under `record.formValues` |
| `form` | The app/form definition — field labels, data names, element structure |
| `QUERY(sql, options)` | Execute SQL against the Query API from template EJS |
| `PHOTOURL(mediaID)` | Signed URL for a photo field value |
| `SIGNATUREURL(id)` | Signed URL for a signature field value |
| `STATICMAP(options)` | Generates a static map image (Google or Esri) |
| `RENDER(feature, options, eachFunction)` | Recursively renders form elements with nesting context |
| `RENDERVALUES(feature, options, eachFunction)` | Recursively renders form values |
| `API(path, options)` | Call a Fulcrum REST API path from template EJS |
| `$params` | URL parameters passed to the report — the interface for parameterized reports |

## EJS Patterns

EJS uses three tag types. Use them correctly — they produce very different output. The three forms are shown in
[`assets/ejs-tag-types.ejs`](assets/ejs-tag-types.ejs):
`<%= %>` outputs an escaped value, `<%- %>` outputs raw HTML, and `<% %>`
executes JavaScript without output.

Every fragment below is a separate file under
[`examples/`](examples/README.md), each with its own `<%# Source: %>` comment.

### Accessing record fields

> Source: [Fulcrum Report Builder variables](https://docs.fulcrumapp.com/docs/variables#record) documents `record.formValues.find('data_name')`, `value`, and `displayValue`. The [Record Links guide](https://docs.fulcrumapp.com/docs/record-links) documents item access.

Look a field up with `record.formValues.find('data_name')`, guard the result, then read `value` for the stored value or `displayValue` for the rendered label:
[`examples/record-field-access.ejs`](examples/record-field-access.ejs).

### Iterating repeatables

> Source: [Fulcrum Report Builder variables](https://docs.fulcrumapp.com/docs/variables#record) documents form-value lookup. The [RENDER function reference](https://docs.fulcrumapp.com/docs/functions#render) documents repeatable item `formValues`.

A repeatable form value exposes `items`, and each item has its own `formValues`:
[`examples/repeatable-table-rows.ejs`](examples/repeatable-table-rows.ejs).

### Conditional blocks

Branch on the stored `value`, not the editable label:
[`examples/conditional-section.ejs`](examples/conditional-section.ejs).

## QUERY() — Multi-Record and Multi-App Reports

The standard report context loads **one record**. `QUERY()` is how you go beyond it.

> Source: [Fulcrum Report Builder `QUERY()` reference](https://docs.fulcrumapp.com/docs/functions#query) documents the call signature. The public [Sketches report example](https://docs.fulcrumapp.com/docs/sketches#add-metadata-to-sketches) demonstrates reading query results from `.rows`.

`QUERY(sql, options)` returns a result object whose `rows` array holds the row objects. Fetch related records with
[`examples/query-related-records.ejs`](examples/query-related-records.ejs),
and see the minimal iteration form in
[`examples/query-rows-iteration.ejs`](examples/query-rows-iteration.ejs).
The read-only SQL shapes themselves are in
[`report-queries.sql`](../fulcrum-query-api/assets/report-queries.sql).

### QUERY() with repeatables
Repeatable data is in a separate table, joined to the parent by `_parent_id`:
[`examples/query-repeatable-join.ejs`](examples/query-repeatable-join.ejs).

### API() for Fulcrum REST resources

> Source: [Fulcrum Report Builder `API()` reference](https://docs.fulcrumapp.com/docs/functions#api)

`API(path, options)` takes a Fulcrum API path and options:
[`examples/api-fulcrum-rest.ejs`](examples/api-fulcrum-rest.ejs).
For external URLs, use only a documented Report Builder function such as `GET(url, options)` or `JSONREQUEST(options)`, and never place credentials in the template.

## Parameterized Reports — the `$params` Interface

When a report URL includes query parameters, they arrive in `$params`. This is the input interface for parameterized and filterable reports, and it is user-controlled. Validate each value against an expected shape before use:
[`examples/params-date-range.ejs`](examples/params-date-range.ejs).

### HTML report as a filter UI
When output type is HTML, you can render a form that re-submits to the same report URL:
[`examples/html-filter-form.ejs`](examples/html-filter-form.ejs).

### Print layout
A PDF report renders in a headless browser, so page-break and table-layout control belong in the template. A starting stylesheet is
[`assets/report-print-layout.css`](assets/report-print-layout.css).

## Verifying Rendered Output

A report can pass data and text tests while still rendering incorrectly. Text extraction and snapshots may confirm content but miss indentation, column widths, rule positions, clipping, and page breaks.

Use two complementary checks:

1. Render representative PDF and HTML fixtures outside the report builder where possible, then compare extracted text for content regressions.
2. Inspect rendered geometry for layout regressions. For PDFs, a tool such as PyMuPDF can locate text rectangles with `page.search_for()` and ruled lines or other drawing geometry with `page.get_drawings()`.

Also inspect the template source for processor-sensitive examples. Do not assume HTML comments disable EJS tags or other template markers; test the actual processor used by the report runtime. Keep literal examples outside executable template syntax when possible.

At minimum, verify one short, one long, and one multi-page fixture, plus any layout with tables, ruled lines, images, or repeatable sections.

## Anti-Patterns

### Debugging in the report builder
The report builder has poor error messages — a syntax error may show a blank white page with no indication of what broke.

**Workflow:** Write and test all logic in VS Code first. Use Node.js to validate JavaScript. Paste into the report builder only when the logic is confirmed working. Keep a local copy of every report template.

### Inventing runtime functions or embedding credentials
Use the documented Fulcrum API helper and a relative API path, as in
[`examples/api-fulcrum-rest.ejs`](examples/api-fulcrum-rest.ejs).

Do not invent helper names or embed API tokens, passwords, or other credentials in report source. Check the current public functions reference before using a runtime function.

### Not using QUERY() for multi-record reports
Trying to pass all data through the single record context (via very long JSON blobs in fields) instead of using `QUERY()`. This breaks as data grows.

### Photo references without PHOTOURL()
A media ID alone is not a usable `src`. Compare both forms in
[`examples/photo-url-signed-src.ejs`](examples/photo-url-signed-src.ejs).

### Missing escaping in SQL strings
The Query API accepts one complete SQL string and has no server-side bind parameters, so the template owns encoding. Always sanitize values used in `QUERY()` strings to prevent injection via `$params`:
[`examples/sanitize-params-for-sql.ejs`](examples/sanitize-params-for-sql.ejs).
Reports are read-only consumers; never write a `QUERY()` statement that modifies data.

## Code Organization

A report template is a single EJS file. As it grows:
- Put data-fetching logic at the top, rendering at the bottom
- Extract reusable HTML sections into EJS partials or JavaScript functions
- Comment each section clearly — you'll be back in 6 months
- If the template exceeds ~300 lines, consider whether it's really two separate reports

## Completion Criteria

- [ ] Report type is explicit — PDF (printer output) or HTML (interactive/API)
- [ ] `QUERY()` is used for any data beyond the single record context — no JSON-stuffing workarounds
- [ ] No credentials are embedded in the Report Template
- [ ] Fulcrum REST calls use documented `API(path, options)` syntax
- [ ] Photo and signature fields use `PHOTOURL()` / `SIGNATUREURL()` — not raw media IDs
- [ ] `$params` values are sanitized before use in SQL strings
- [ ] Template was authored and tested outside the report builder before pasting in
- [ ] Rendered output was checked for both content and geometry — text comparison alone is insufficient
- [ ] Representative short, long, and multi-page fixtures were rendered when layout matters
- [ ] For parameterized reports: `$params` interface is documented at the top of the template
- [ ] Report Templates are managed with the registered tools listed above and record reports are generated with `fulcrum_reports_create` when App MCP is available

## References

- [Fulcrum reports introduction](https://docs.fulcrumapp.com/docs/reports-introduction)
- [Fulcrum Query API introduction](https://docs.fulcrumapp.com/reference/query-intro)
- [Fulcrum report templates API](https://docs.fulcrumapp.com/reference/report-templates-api)
- [Fulcrum Report Builder functions](https://docs.fulcrumapp.com/docs/functions)
- [Report example index](examples/README.md)
- [Report function reference](resources/report-template-reference.md)
- [Agent Skills specification](https://agentskills.io/specification)
