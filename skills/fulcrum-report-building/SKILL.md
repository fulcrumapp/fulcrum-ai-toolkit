---
name: fulcrum-report-building
description: Use when building, modifying, or debugging Fulcrum report templates. Covers report types, EJS patterns, context objects, QUERY() for multi-record reports, the HTML-as-backend-service pattern, and common mistakes. Also use when a builder asks about generating PDFs, custom outputs, or parameterized reports.
---

A Fulcrum **report template** is EJS (Embedded JavaScript) that runs server-side inside a headless Chrome instance (Puppeteer). The output is a PDF or HTML page — not a live view. Every report starts from a single record's context and expands from there via `QUERY()`.

## Report Types

### Standard PDF
Pre-built generic output with toggle controls (header, footer, cover page, field visibility, map). No coding required. Limited customization — customers often discover it can't produce the pixel-perfect output they need.

### Advanced report (PDF or HTML)
Unlocks the full EJS code behind the standard report. You can modify the standard template or build from scratch. **This is where report building happens.**

To switch to HTML output: change report type to HTML in settings. This enables the report as a custom UI or backend service.

> **Unlock HTML output:** The HTML output type requires a hidden feature flag. In the browser console, run:
> ```javascript
> localStorage.setItem('reportsEnabled', 1);
> ```
> Then reload — the HTML option appears in the report type selector.

## Core Context Objects

These are available in every report without any setup:

| Object/Function | What it gives you |
|----------------|-------------------|
| `record` | The current record (from fulcrum-core) — fields, status, timestamps, geometry |
| `form` | The app/form definition — field labels, data names, element structure |
| `QUERY(sql, options)` | Execute SQL against the Query API — the key to multi-record reports |
| `PHOTOURL(mediaID)` | Signed URL for a photo field value |
| `SIGNATUREURL(id)` | Signed URL for a signature field value |
| `STATICMAP(options)` | Generates a static map image (Google or Esri) |
| `RENDER(feature, options, eachFn)` | Recursively renders all form elements — used in the standard template |
| `APIREQUEST(options)` | HTTP request with auto-injected auth token when `api: true` |
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

### APIREQUEST() for non-SQL data

```ejs
<% const assetData = APIREQUEST({
  url: 'https://api.example.com/assets/' + record.getValue('asset_id'),
  method: 'GET',
  api: true  <%# auto-injects the Fulcrum API token — never hardcode tokens %>
}); %>
```

## Parameterized Reports — the `$params` Interface

When a report URL includes query parameters, they arrive in `$params`. This is the input interface for parameterized and filterable reports.

```ejs
<%# URL: .../run/template_id?start_date=2024-01-01&end_date=2024-03-31 %>
<% const startDate = $params.start_date || '2024-01-01'; %>
<% const endDate = $params.end_date || new Date().toISOString().slice(0, 10); %>

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

## Reports as Backend Services

One of the most powerful and underused patterns. A report set to HTML with "raw" response type acts as a server-side script callable via API.

**How it works:**
1. Set report output to HTML, response type to "raw"
2. Get the template ID from the report URL after clicking Open
3. Call via POST: `https://api.fulcrumapp.com/run/{template_id}`
4. Use `WRITE()` and `SETCONTENTTYPE()` to return structured responses

```ejs
<%# Return JSON from a report — works as a webhook handler or microservice %>
<% SETCONTENTTYPE('application/json'); %>
<% const result = { status: 'ok', count: records.rows.length }; %>
<% WRITE(JSON.stringify(result)); %>
```

**Common use case:** Workflow webhook fires → calls report endpoint → report runs server-side logic (updates records, calls external API, queries data) → returns JSON. This lets you build lightweight serverless logic inside Fulcrum without any external hosting.

> Full guide: https://fulcrumapp.atlassian.net/wiki/spaces/PS/pages/2120122380

## Anti-Patterns

### Debugging in the report builder
The report builder has poor error messages — a syntax error may show a blank white page with no indication of what broke.

**Workflow:** Write and test all logic in VS Code first. Use Node.js to validate JavaScript. Paste into the report builder only when the logic is confirmed working. Keep a local copy of every report template.

### Hardcoding API tokens
```ejs
<%# BAD — token is visible to anyone who can view the report template %>
<% const data = APIREQUEST({ url: '...', headers: { 'X-ApiToken': 'abc123' } }); %>

<%# GOOD — api: true injects the token from the authenticated context %>
<% const data = APIREQUEST({ url: '...', api: true }); %>
```

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
- [ ] No hardcoded API tokens — `api: true` in `APIREQUEST()` or token passed via header
- [ ] Photo and signature fields use `PHOTOURL()` / `SIGNATUREURL()` — not raw media IDs
- [ ] `$params` values are sanitized before use in SQL strings
- [ ] Template was authored and tested outside the report builder before pasting in
- [ ] For parameterized reports: `$params` interface is documented at the top of the template
- [ ] For backend-service reports: `SETCONTENTTYPE()` and `WRITE()` are used for structured output
