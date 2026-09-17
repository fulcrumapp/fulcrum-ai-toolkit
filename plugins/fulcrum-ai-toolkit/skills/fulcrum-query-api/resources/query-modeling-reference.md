# Query Modeling Reference

## Discover Before Naming

Use Query MCP `form_summaries` to identify the intended form, then
`get_form_query_tables(form_id)` to discover its current tables and columns
before composing a production query. Live gateway schemas govern exact
arguments and result shapes.

> Source: [Query API introduction](https://docs.fulcrumapp.com/reference/query-intro).

| Table type | Modeling role |
| --- | --- |
| Form | One row per primary record for an app |
| Repeatable | Child rows; use the documented record, parent, and child identifiers to navigate nesting |
| Link | Join rows connecting source and linked records |
| Media | Join rows connecting record fields to media system tables |
| System | Organization metadata such as forms, memberships, media, choices, projects, roles, changesets, devices, and record links |

Do not assume every REST resource is queryable. The current Query API source
lists exclusions and is authoritative for the present table surface.

## Join Review

- Determine the requested row grain before joining.
- Confirm each relationship key from discovered columns.
- Account for missing children, multiple children, multiple links, and nested
  repeatables.
- Prevent accidental multiplication by aggregating or deduplicating at the
  intended grain.
- Treat display names and data names as mutable; preserve discovered stable
  identifiers in reviewed query assets.

## Metadata And Spatial Review

Form tables expose record metadata and geometry columns described by the current
Query API catalog. Request only the metadata needed for the outcome.

The public Query API supports many PostgreSQL functions and documents PostGIS
support. Use spatial types/functions only when the current source documents the
needed behavior and the discovered geometry/SRID is compatible. Include the
documented geometry column when requesting a spatial response format.

> Source: [Query API PostgreSQL, PostGIS, metadata, and response guidance](https://docs.fulcrumapp.com/reference/query-intro).

## Safe Parameters

- Allowlist identifiers from metadata.
- Pass `query_records` exactly one read-only SQL statement on a single line.
- Use JSON output for analysis unless the requested deliverable needs another
  format.
- The public Query request accepts one complete SQL string in `q`; it has no
  server-side bind-parameter contract.
- For dynamic values, use a reviewed, type-specific SQL-literal encoder in the
  caller. If no suitable encoder exists, stop instead of interpolating
  untrusted input or accepting raw SQL fragments.
- Keep credentials in the client's secret mechanism, never in SQL or a shared
  URL.
- Add `LIMIT 100` to exploratory queries unless the user explicitly asks for
  more. Do not force that exploration cap onto an intentional, reviewed Report
  Builder/runtime query.
- Require confirmation before unbounded or high-row queries, `SELECT *` or
  other broad-column retrieval, cross-app joins, or likely personal, location,
  or media data.
- Treat errors and truncation as failures rather than empty successful results.

> Source: [POST Query request contract](https://docs.fulcrumapp.com/reference/query-post)
> defines the complete SQL `q` field plus optional `format` and `table_name`;
> it defines no bind-parameter field.

If Query MCP is unavailable, provide this direct Query API request contract as
a reviewable fallback and state that execution did not occur.

## References

- [POST Query request contract](https://docs.fulcrumapp.com/reference/query-post)
- [Query API tools](https://docs.fulcrumapp.com/reference/query-intro#tools)
