---
name: fulcrum-report-building
description: Use when building, modifying, generating, or debugging Fulcrum reports and Report Templates. Covers the documented Report Builder runtime, App MCP template CRUD and report generation, EJS patterns, context objects, QUERY() for multi-record reports, and common mistakes.
---

A Fulcrum **report template** is EJS (Embedded JavaScript) that runs server-side inside a headless Chrome instance (Puppeteer). The output is a PDF or HTML page — not a live view. Every report starts from a single record's context and expands from there via `QUERY()`.

> **Provenance:** Report APIs and template behavior should be checked against current Fulcrum documentation. The rendering workflow below is a toolkit convention, not a guarantee of public product support.

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

> Source: [App MCP PR #28](https://github.com/fulcrumapp/app-mcp/pull/28) at commit [`1259888`](https://github.com/fulcrumapp/app-mcp/commit/125988885880b4916ef499cf5ebd535ccfb195f4) defines the registered report tools and default-template result. Runtime names come from the [Fulcrum Report Builder functions reference](https://docs.fulcrumapp.com/docs/functions).

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
| `record` | The current record (from fulcrum-core) — fields, status, timestamps, geometry |
| `form` | The app/form definition — field labels, data names, element structure |
| `QUERY(sql, options)` | Execute SQL against the Query API from template EJS |
| `PHOTOURL(mediaID)` | Signed URL for a photo field value |
| `SIGNATUREURL(id)` | Signed URL for a signature field value |
| `STATICMAP(options)` | Generates a static map image (Google or Esri) |
| `RENDER(feature, options, eachFn)` | Recursively renders all form elements — used in the standard template |
| `API(path, options)` | Call a Fulcrum REST API path from template EJS |
| `$params` | URL parameters passed to the report — the interface for parameterized reports |

## EJS Patterns

EJS uses three tag types. Use them correctly — they produce very different output:

```ejs
<%= expression %>   <%# Outputs the value — HTML-escaped %>
<%- expression %>   <%# Outputs raw HTML — use for trusted HTML content %>
<% statement %>     <%# Executes JavaScript — no output %>
```

### Accessing record fields

```ejs
<%# Single-value field — use the field's data_name %>
<%= record.getDisplayValue('inspector_name') %>

<%# Choice field — getValue() returns the stored value, getDisplayValue() returns the label %>
<%= record.getDisplayValue('site_condition') %>

<%# Yes/No field %>
<%= record.getValue('photos_taken') === 'true' ? 'Yes' : 'No' %>

<%# Date field %>
<%= new Date(record.getValue('inspection_date')).toLocaleDateString() %>
```

### Iterating repeatables

```ejs
<%# Repeatable items are accessed via record.getRepeatableValues() %>
<% const observations = record.getRepeatableValues('observations'); %>
<% observations.forEach(function(obs) { %>
  <tr>
    <td><%= obs.getDisplayValue('species') %></td>
    <td><%= obs.getValue('count') %></td>
  </tr>
<% }); %>
```

### Conditional blocks

```ejs
<% if (record.getValue('requires_followup') === 'true') { %>
  <div class="alert">Follow-up required: <%= record.getDisplayValue('followup_reason') %></div>
<% } %>
```

## QUERY() — Multi-Record and Multi-App Reports

The standard report context loads **one record**. `QUERY()` is how you go beyond it.

```ejs
<%# Fetch related records from the same app %>
<%# Sanitize record values before interpolating into SQL to prevent injection %>
<% const siteId = (record.getValue('site_id') || '').replace(/[^a-zA-Z0-9_-]/g, ''); %>
<% const relatedInspections = QUERY(
  `SELECT * FROM "Site Inspections"
   WHERE site_id = '${siteId}'
   ORDER BY _created_at DESC`,
  { format: 'json' }
); %>

<%# Access the rows %>
<% relatedInspections.rows.forEach(function(row) { %>
  <tr>
    <td><%= row.inspector_name %></td>
    <td><%= row.inspection_date %></td>
    <td><%= row.status %></td>
  </tr>
<% }); %>
```

### QUERY() with repeatables
Repeatable data is in a separate table, joined to the parent by `fulcrum_parent_id`:

```ejs
<% const items = QUERY(
  `SELECT r.*
   FROM "Work Orders/line_items" r
   WHERE r.fulcrum_parent_id = '${record.id}'`,
  { format: 'json' }
); %>
```

### API() for Fulcrum REST resources

> Source: [Fulcrum Report Builder `API()` reference](https://docs.fulcrumapp.com/docs/functions#api)

```ejs
<% const choiceLists = API('/choice_lists', {
  qs: { per_page: 1 }
}); %>
<%= choiceLists.choice_lists[0].name %>
```

`API()` takes a Fulcrum API path and options. For external URLs, use only a documented Report Builder function such as `GET()` or `JSONREQUEST()` and never place credentials in the template.

## Parameterized Reports — the `$params` Interface

When a report URL includes query parameters, they arrive in `$params`. This is the input interface for parameterized and filterable reports.

```ejs
<%# URL: .../run/template_id?start_date=2024-01-01&end_date=2024-03-31 %>
<% const datePattern = /^\d{4}-\d{2}-\d{2}$/; %>
<% const requestedStartDate = $params.start_date || ''; %>
<% const requestedEndDate = $params.end_date || ''; %>
<% const startDate = datePattern.test(requestedStartDate) ? requestedStartDate : '2024-01-01'; %>
<% const today = new Date().toISOString().slice(0, 10); %>
<% const endDate = datePattern.test(requestedEndDate) ? requestedEndDate : today; %>

<% const records = QUERY(
  `SELECT * FROM "Inspections"
   WHERE _created_at BETWEEN '${startDate}' AND '${endDate}'`,
  { format: 'json' }
); %>
```

### HTML report as a filter UI
When output type is HTML, you can render a form that re-submits to the same report URL:

```ejs
<form method="GET">
  <label>Start Date: <input type="date" name="start_date" value="<%= startDate %>"></label>
  <label>End Date: <input type="date" name="end_date" value="<%= endDate %>"></label>
  <button type="submit">Generate</button>
</form>

<%# Render results only after params are provided %>
<% if ($params.start_date) { %>
  <%# ... render the table ... %>
<% } %>
```

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
```ejs
<%# Use the documented Fulcrum API helper and a relative API path. %>
<% const forms = API('/forms', { qs: { per_page: 1 } }); %>
```

Do not invent helper names or embed API tokens, passwords, or other credentials in report source. Check the current public functions reference before using a runtime function.

### Not using QUERY() for multi-record reports
Trying to pass all data through the single record context (via very long JSON blobs in fields) instead of using `QUERY()`. This breaks as data grows.

### Photo references without PHOTOURL()
```ejs
<%# BAD — the media_id alone is not a usable URL %>
<img src="<%= record.getValue('site_photo') %>">

<%# GOOD — wrap in PHOTOURL() to get a signed URL %>
<img src="<%= PHOTOURL(record.getValue('site_photo')) %>">
```

### Missing escaping in SQL strings
Always sanitize values used in QUERY() strings to prevent injection via `$params`:

```ejs
<%# Avoid direct interpolation of user-controlled params in SQL %>
<% const safeStatus = ($params.status || '').replace(/[^a-zA-Z_]/g, ''); %>
<% const records = QUERY(`SELECT * FROM "App" WHERE _status = '${safeStatus}'`, {format:'json'}); %>
```

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
- [ ] Report Templates are managed with `fulcrum_report_templates_*` and record reports are generated with `fulcrum_reports_create` when App MCP is available

## References

- [Fulcrum reports introduction](https://docs.fulcrumapp.com/docs/reports-introduction)
- [Fulcrum Query API introduction](https://docs.fulcrumapp.com/reference/query-intro)
- [Fulcrum report templates API](https://docs.fulcrumapp.com/reference/report-templates-api)
- [Fulcrum Report Builder functions](https://docs.fulcrumapp.com/docs/functions)
- [App MCP tool-contract prerequisite](https://github.com/fulcrumapp/app-mcp/pull/28)
- [Agent Skills specification](https://agentskills.io/specification)
