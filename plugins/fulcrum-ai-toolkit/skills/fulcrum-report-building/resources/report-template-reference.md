# Report Template Functions Reference

> Source: [Fulcrum Report Builder functions](https://docs.fulcrumapp.com/docs/functions) for runtime signatures; [Report Builder variables](https://docs.fulcrumapp.com/docs/variables#record) for record value access; and the public [Sketches report example](https://docs.fulcrumapp.com/docs/sketches#add-metadata-to-sketches) for `QUERY()` result handling.
> Source: [App MCP PR #28](https://github.com/fulcrumapp/app-mcp/pull/28) at commit [`f8c041e`](https://github.com/fulcrumapp/app-mcp/commit/f8c041ee309c61c6154cce1a7b2cb84fc4c4cf10) for Report Template persistence and report generation tools.
> Verified: 2026-09-02

When App MCP is registered, use `fulcrum_report_templates_list`, `fulcrum_report_templates_get`, `fulcrum_report_templates_create`, `fulcrum_report_templates_update`, and `fulcrum_report_templates_delete` for template persistence, and use `fulcrum_reports_create` for report generation. This file documents functions available inside Report Builder EJS; it does not imply App MCP Query API, record, or media CRUD tools.

## Available Functions

| Function | Purpose |
|----------|---------|
| API(path, options) | Execute REST API calls to Fulcrum paths |
| AUDIOURL(id, options) | Generate public audio file URL |
| FORMATDATE(date, options) | Format date values using Intl.DateTimeFormat options |
| GET(url, options) | Perform synchronous HTTP GET request |
| GETBLOB(url, options) | Fetch binary data via HTTP GET (returns ArrayBuffer) |
| JSONREQUEST(options) | Perform a request and automatically parse JSON |
| LOG(string) | Output debug messages to report results |
| PHOTOURL(id, options) | Generate public photo URL |
| QS(object) | Convert object into URL query string |
| QUERY(sql, options) | Execute a SQL query on the Query API from report EJS |
| QUERYVALUE(sql) | Run SQL and return first column of first row |
| RENDER(feature, options, eachFunction) | Recursively process form elements with nesting context |
| RENDERVALUES(feature, options, eachFunction) | Recursively process form values |
| SIGNATUREURL(id, options) | Generate public signature file URL |
| SKETCHURL(id, options) | Generate public sketch URL |
| STATICMAP(options) | Create Google or Esri static map image |
| TOJSON(json) | Stringify a JSON value |
| VIDEOURL(id, options) | Generate public video file URL |

## Report Context Object

Reports have access to:
- `record`: the current record object
- `form`: the form/app schema
- `record.formValues.find('data_name')`: a field's form-value object
- `record.formValues.find('repeatable_data_name').items`: repeatable child items

## EJS Template Basics

Reports use EJS (Embedded JavaScript) templates:
- `<%= expression %>` — Output escaped value
- `<%- expression %>` — Output unescaped HTML
- `<% code %>` — Execute JavaScript (no output)

## QUERY() for Multi-Record Reports

```ejs
<% const result = QUERY(
  `SELECT * FROM "Inspections"
   WHERE _status = 'complete'
   ORDER BY _created_at DESC
   LIMIT 100`,
  { format: 'json' }
); %>

<% result.rows.forEach(function(row) { %>
  <div><%= row.id %></div>
<% }); %>
```

`QUERY()` returns a result object. Its `rows` array contains the row objects used for cross-record analytics, summary reports, and dashboards.
