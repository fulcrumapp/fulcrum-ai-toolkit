# Query API Asset Index

Read-only SQL shapes for the Fulcrum Query API. Every file carries `-- Source:`
comments naming its public documentation.

| File | What it holds |
| --- | --- |
| [`query-api-examples.sql`](query-api-examples.sql) | App-table sampling, parent/repeatable joins, PostGIS distance filtering, record metadata columns, and a system-table lookup. |
| [`report-queries.sql`](report-queries.sql) | The SQL shapes a Report Template passes to `QUERY()`. |

## Contract

- The Query API is read-only. These files contain SELECT statements only, and
  no statement here may be rewritten as a data- or schema-modifying statement.
- The endpoint accepts one complete SQL string in `q` and exposes no
  server-side bind parameters. `:name` placeholders in these files stand for
  encoded SQL literals produced by caller code, not for binds.
- Allowlist table and column identifiers from discovered metadata. Table names
  derive from app names, so quote any name with spaces or special characters.
- Keep credentials in the client's secret mechanism, never in SQL or a shared
  URL.
