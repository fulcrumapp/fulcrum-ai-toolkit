# Query API Asset Index

Read-only SQL shapes for Query MCP and the direct Fulcrum Query API fallback.
Every file carries `-- Source:` comments naming its public documentation.

| File | What it holds |
| --- | --- |
| [`query-api-examples.sql`](query-api-examples.sql) | App-table sampling, parent/repeatable joins, PostGIS distance filtering, record metadata columns, and a system-table lookup. |
| [`report-queries.sql`](report-queries.sql) | The SQL shapes a Report Template passes to `QUERY()`. |

## Contract

- The Query API is read-only. These files contain SELECT statements only, and
  no statement here may be rewritten as a data- or schema-modifying statement.
- Query MCP `query_records` accepts a single-line SQL statement. Its executable
  examples are kept on one line; collapse reviewed multi-line SQL before
  invoking the tool.
- Exploratory Query MCP examples use `LIMIT 100` or less. This default does not
  impose a cap on intentional Report Builder/runtime queries.
- Confirm broad columns, high or unbounded row counts, cross-app joins, and
  likely personal, location, or media data before retrieval.
- The endpoint accepts one complete SQL string in `q` and exposes no
  server-side bind parameters. `:name` placeholders in these files stand for
  encoded SQL literals produced by caller code, not for binds.
- Allowlist table and column identifiers from discovered metadata. Table names
  derive from app names, so quote any name with spaces or special characters.
- Keep credentials in the client's secret mechanism, never in SQL or a shared
  URL.
- Treat errors and truncated responses as failures, not empty successful
  results. If Query MCP is unavailable, use the documented direct API contract
  as a reviewable handoff and do not claim execution.
