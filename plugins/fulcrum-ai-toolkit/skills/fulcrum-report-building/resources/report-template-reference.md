# Report Template Functions Reference

> Source: [Fulcrum Report Builder functions](https://docs.fulcrumapp.com/docs/functions.md) for runtime signatures; [Report Builder variables](https://docs.fulcrumapp.com/docs/variables#record) for record value access; and the public [Sketches report example](https://docs.fulcrumapp.com/docs/sketches#add-metadata-to-sketches) for `QUERY()` result handling.
> Connector authority: Live installed App MCP schemas define Report Template
> persistence and report generation tools. Runtime behavior is sourced from the
> public references below.
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

The same three forms, with comments, are in
[`ejs-tag-types.ejs`](../assets/ejs-tag-types.ejs). Fragments for record
access, repeatables, queries, parameters, and media are indexed in
[`examples/README.md`](../examples/README.md).

## QUERY() for Multi-Record Reports

`QUERY()` returns a result object. Its `rows` array contains the row objects used for cross-record analytics, summary reports, and dashboards. The minimal
`result.rows.forEach(function(row)` iteration is in
[`query-rows-iteration.ejs`](../examples/query-rows-iteration.ejs); a filtered
version with a sanitized value is in
[`query-related-records.ejs`](../examples/query-related-records.ejs).

The Query API is read-only and exposes no server-side bind parameters. Encode
or allowlist every interpolated value before it reaches `QUERY()`. The SQL
shapes themselves are in
[`report-queries.sql`](../../fulcrum-query-api/assets/report-queries.sql).
