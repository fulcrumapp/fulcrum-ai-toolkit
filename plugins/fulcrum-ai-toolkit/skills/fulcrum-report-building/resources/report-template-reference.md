# Report Template Functions Reference

> Source: https://docs.fulcrumapp.com/docs/functions.md
> Source: https://github.com/fulcrumapp/app-mcp/pull/28
> Verified: 2026-09-02

When App MCP is registered, use the live `fulcrum_report_templates_*` schemas for template persistence and `fulcrum_reports_create` for report generation. This file documents functions available inside Report Builder EJS; it does not imply App MCP Query API, record, or media CRUD tools.

## Available Functions

| Function | Purpose |
|----------|---------|
| API(path, options) | Execute REST API calls to Fulcrum paths |
| AUDIOURL(audio_id) | Generate public audio file URL |
| FORMATDATE(date, options) | Format date values using Intl.DateTimeFormat options |
| GET(url) | Perform synchronous HTTP GET request |
| GETBLOB(url) | Fetch binary data via HTTP GET (returns ArrayBuffer) |
| JSONREQUEST(url) | HTTP GET with automatic JSON parsing |
| LOG(message) | Output debug messages to report results |
| PHOTOURL(photo_id, version) | Generate public photo URL. Versions: original, thumbnail, large |
| QS(object) | Convert object into URL query string |
| QUERY(sql, options) | Execute a SQL query on the Query API from report EJS |
| QUERYVALUE(sql) | Run SQL and return first column of first row |
| RENDER(elements, callback) | Recursively process form elements with custom callbacks (handles nested/repeatable fields) |
| RENDERVALUES(callback) | Iterate through form values for dynamic report generation |
| SIGNATUREURL(signature_id) | Generate public signature file URL |
| SKETCHURL(sketch_id) | Generate public sketch URL |
| STATICMAP(options) | Create Google or Esri static map image |
| TOJSON(object) | Stringify JSON object |
| VIDEOURL(video_id) | Generate public video file URL |

## Report Context Object

Reports have access to:
- record: The current record object
- form: The form/app schema
- record.formValues: All field values
- Repeatable children via record iteration

## EJS Template Basics

Reports use EJS (Embedded JavaScript) templates:
- `<%= expression %>` — Output escaped value
- `<%- expression %>` — Output unescaped HTML
- `<% code %>` — Execute JavaScript (no output)

## QUERY() for Multi-Record Reports

```javascript
var results = QUERY("SELECT * FROM 'form_id' WHERE status = 'complete' ORDER BY created_at DESC LIMIT 100");
```

Returns an array of row objects. Use for cross-record analytics, summary reports, and dashboards.
