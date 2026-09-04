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
| `PHOTOURL(id, options)` | Signed URL for a photo field value |
| `SIGNATUREURL(id, options)` | Signed URL for a signature field value |
| `STATICMAP(options)` | Generates a static map image (Google or Esri) |
| `RENDER(feature, options, eachFunction)` | Recursively renders form elements with nesting context |
| `RENDERVALUES(feature, options, eachFunction)` | Recursively renders form values |
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

> Source: [Fulcrum Report Builder variables](https://docs.fulcrumapp.com/docs/variables#record) documents `record.formValues.find('data_name')`, `value`, and `displayValue`. The [Record Links guide](https://docs.fulcrumapp.com/docs/record-links) documents item access.

```ejs
<%# Single-value field — use the field's data_name %>
<% const inspectorName = record.formValues.find('inspector_name'); %>
<%= inspectorName ? inspectorName.displayValue : '' %>

<%# Choice field — value is stored; displayValue is the rendered label %>
<% const siteCondition = record.formValues.find('site_condition'); %>
<%= siteCondition ? siteCondition.displayValue : '' %>
<% const storedSiteCondition = siteCondition ? siteCondition.value : null; %>

<%# Yes/No field %>
<% const photosTaken = record.formValues.find('photos_taken'); %>
<%= photosTaken ? photosTaken.displayValue : '' %>

<%# Date field %>
<% const inspectionDate = record.formValues.find('inspection_date'); %>
<%= inspectionDate && inspectionDate.value ? FORMATDATE(new Date(inspectionDate.value)) : '' %>
```

### Iterating repeatables

> Source: [Fulcrum Report Builder variables](https://docs.fulcrumapp.com/docs/variables#record) documents form-value lookup. The [RENDER function reference](https://docs.fulcrumapp.com/docs/functions#render) documents repeatable item `formValues`.

```ejs
<% const observations = record.formValues.find('observations'); %>
<% const observationItems = observations ? observations.items : []; %>
<% observationItems.forEach(function(observation) { %>
  <% const species = observation.formValues.find('species'); %>
  <% const count = observation.formValues.find('count'); %>
  <tr>
    <td><%= species ? species.displayValue : '' %></td>
    <td><%= count ? count.value : '' %></td>
  </tr>
<% }); %>
```

### Conditional blocks

```ejs
<% const followupStatus = record.formValues.find('followup_status'); %>
<% const followupReason = record.formValues.find('followup_reason'); %>
<% if (followupStatus && followupStatus.value === 'required') { %>
  <div class="alert">Follow-up required: <%= followupReason ? followupReason.displayValue : '' %></div>
<% } %>
```

## QUERY() — Multi-Record and Multi-App Reports

The standard report context loads **one record**. `QUERY()` is how you go beyond it.

> Source: [Fulcrum Report Builder `QUERY()` reference](https://docs.fulcrumapp.com/docs/functions#query) documents the call signature. The public [Sketches report example](https://docs.fulcrumapp.com/docs/sketches#add-metadata-to-sketches) demonstrates reading query results from `.rows`.

```ejs
<%# Fetch related records from the same app %>
<%# Sanitize record values before interpolating into SQL to prevent injection %>
<% const siteIdField = record.formValues.find('site_id'); %>
<% const siteId = ((siteIdField && siteIdField.value) || '').replace(/[^a-zA-Z0-9_-]/g, ''); %>
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
<% const itemResults = QUERY(
  `SELECT r.*
   FROM "Work Orders/line_items" r
   WHERE r.fulcrum_parent_id = '${record.id}'`,
  { format: 'json' }
); %>
<% const items = itemResults.rows; %>
```

### API() for Fulcrum REST resources

> Source: [Fulcrum Report Builder `API()` reference](https://docs.fulcrumapp.com/docs/functions#api)

```ejs
<% const choiceLists = API('/choice_lists', {
  qs: { per_page: 1 }
}); %>
<%= choiceLists.choice_lists[0].name %>
```

`API()` takes a Fulcrum API path and options. For external URLs, use only a documented Report Builder function such as `GET()` or `JSONREQUEST(options)` and never place credentials in the template.

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

<% const recordResults = QUERY(
  `SELECT * FROM "Inspections"
   WHERE _created_at BETWEEN '${startDate}' AND '${endDate}'`,
  { format: 'json' }
); %>
<% const records = recordResults.rows; %>
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
<% const sitePhoto = record.formValues.find('site_photo'); %>
<% const sitePhotoItems = sitePhoto && Array.isArray(sitePhoto.items) ? sitePhoto.items : []; %>
<% const firstSitePhoto = sitePhotoItems[0]; %>

<%# BAD — the media_id alone is not a usable URL %>
<img src="<%= firstSitePhoto ? firstSitePhoto.mediaID : '' %>">

<%# GOOD — wrap in PHOTOURL() to get a signed URL %>
<img src="<%= firstSitePhoto ? PHOTOURL(firstSitePhoto.mediaID) : '' %>">
```

### Missing escaping in SQL strings
Always sanitize values used in QUERY() strings to prevent injection via `$params`:

```ejs
<%# Avoid direct interpolation of user-controlled params in SQL %>
<% const safeStatus = ($params.status || '').replace(/[^a-zA-Z_]/g, ''); %>
<% const result = QUERY(`SELECT * FROM "App" WHERE _status = '${safeStatus}'`, {format:'json'}); %>
<% const rows = result.rows; %>
<% rows.forEach(function(row) { %>
  <%# Render fields from row here. %>
<% }); %>
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
- [ ] Report Templates are managed with the registered tools listed above and record reports are generated with `fulcrum_reports_create` when App MCP is available

## References

- [Fulcrum reports introduction](https://docs.fulcrumapp.com/docs/reports-introduction)
- [Fulcrum Query API introduction](https://docs.fulcrumapp.com/reference/query-intro)
- [Fulcrum report templates API](https://docs.fulcrumapp.com/reference/report-templates-api)
- [Fulcrum Report Builder functions](https://docs.fulcrumapp.com/docs/functions)
- [Agent Skills specification](https://agentskills.io/specification)
