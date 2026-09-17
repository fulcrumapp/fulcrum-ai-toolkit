---
name: fulcrum-query-api
description: Discover, model, execute, and validate safe read-only Fulcrum queries through Query MCP. Use for system, app, repeatable, link, and media tables; metadata discovery; parameterization; documented PostgreSQL/PostGIS analysis; and direct Query API fallback.
---

# Fulcrum Query API

Discover current metadata, model a read-only query, execute it through Query
MCP when authorized, and validate the result. Keep the direct Query API as a
reviewable fallback when the gateway does not advertise Query MCP tools.

## When To Use

Use this skill for Query API table discovery, app/repeatable/link/media joins,
system metadata, report-query modeling, spatial analysis, exports, and
read-only analytics.

## When Not To Use

- Use [`fulcrum-report-building`](../fulcrum-report-building/SKILL.md) for
  Report Template rendering.
- Use [`fulcrum-data-migration`](../fulcrum-data-migration/SKILL.md) for
  cutover, reconciliation, and rollback design.
- Do not use Query API for writes or imply that a read-only query token makes a
  broader user token harmless.

## Source Order

1. Current public Query API docs for behavior, table types, helper functions,
   limits, and response formats.
2. Live Fulcrum MCP gateway schemas for exact tool names, arguments, and result
   shapes.
3. Metadata discovered from the target organization for actual table and column
   names.
4. Public OpenAPI for the direct Query API fallback request shape.

> Source: [Query API introduction](https://docs.fulcrumapp.com/reference/query-intro)
> and [POST Query](https://docs.fulcrumapp.com/reference/query-post).

## Query MCP Tools

The Fulcrum MCP endpoint is a federated gateway for App MCP and Query MCP. These
stable Query MCP tools define the workflow; inspect the live gateway schemas
before every invocation because they remain authoritative for exact arguments
and result shapes.

| Tool | Purpose |
| --- | --- |
| `form_summaries` | List forms available to the authenticated user; takes no inputs |
| `get_form_query_tables(form_id)` | Return Query table definitions for the selected form |
| `query_records(query, format)` | Execute read-only, single-line SQL; use `json` unless the requested output needs another format |

## Workflow

1. **Define the result.** Specify grain, fields, filters, time semantics, spatial
   needs, format, expected cardinality, and freshness.
2. **Discover metadata.** Call `form_summaries`, identify the intended form,
   then call `get_form_query_tables(form_id)`. Never derive SQL identifiers
   solely from display labels or stale examples.
3. **Model relationships.** Use
   [`query-modeling-reference.md`](resources/query-modeling-reference.md) to
   distinguish system, form, repeatable, link, and media tables and select
   explicit join keys. Read-only starting shapes — app-table sampling, a
   parent/repeatable join, a PostGIS distance filter, and record metadata
   columns — are in
   [`assets/query-api-examples.sql`](assets/query-api-examples.sql).
4. **Separate identifiers from values.** The Query endpoint accepts one complete
   SQL string in `q`; it does not expose server-side bind parameters. Allowlist
   discovered table/column identifiers. For dynamic values, require a reviewed,
   type-specific SQL-literal encoder in caller code. If no suitable encoder
   exists, stop rather than interpolating untrusted input.
   > Source: [POST Query request schema](https://docs.fulcrumapp.com/reference/query-post)
   > defines `q`, `format`, and `table_name` and no bind-parameter field.
5. **Constrain the query.** Select only required columns and bound time/space.
   Add `LIMIT 100` to exploratory queries unless the user explicitly requests
   more. This exploration default does not rewrite an intentional, reviewed
   Report Builder `QUERY()` or other runtime query.
6. **Confirm sensitive or broad retrieval.** Obtain confirmation before an
   unbounded or high-row query, broad-column retrieval such as `SELECT *`,
   cross-app joins, or likely personal, location, or media data.
7. **Execute through Query MCP.** When the request clearly authorizes
   retrieval, pass one read-only SQL statement on a single line to
   `query_records`; use `json` for analysis by default. Do not split a query
   into multiple statements or use the tool for mutations.
8. **Validate the result.** Treat tool errors, permission failures, and
   truncation as failures, never as an empty successful result. Compare counts,
   nullability, duplicates, parent-child cardinality, geometry, response
   format, and any truncation metadata against the expected shape.

## Fulcrum MCP And Direct API Boundaries

The Fulcrum MCP gateway federates App MCP configuration operations and Query
MCP read-only execution. Query MCP does not add record CRUD, media CRUD, or
mutation support. Never route SQL through an unrelated App MCP operation or
infer a tool not present in the live gateway schema.

If Query MCP tools are unavailable, do not claim execution. Provide the
single-statement SQL, identifier allowlist, literal-encoding contract, expected
output, reconciliation checks, and documented direct Query API request shape
for an authorized client to review and execute.

Report Builder `QUERY()` is a server-side template runtime function. It is not
the Query MCP `query_records` tool, and the two execution contexts must not be
presented as interchangeable.

> Connector authority: Live installed Fulcrum MCP gateway schemas define the
> available App MCP and Query MCP tool contracts.

## Confirmation, Privacy, And Failure

Read-only access still exposes sensitive tenant data. Minimize columns and rows,
keep tokens out of query text and logs, and do not paste production results into
public tools. Require separate explicit authorization before using result IDs in
any REST mutation.

If metadata, permissions, plan access, spatial support, safe literal encoding,
or result completeness is unknown, do not guess. Report the failed assumption,
retain the read-only boundary, and provide the smallest discovery step needed.

## References

- [Query API introduction](https://docs.fulcrumapp.com/reference/query-intro)
- [POST Query](https://docs.fulcrumapp.com/reference/query-post)
- [Fulcrum Query functions](https://docs.fulcrumapp.com/reference/query-functions)
- [Fulcrum public OpenAPI](https://raw.githubusercontent.com/fulcrumapp/api/v2/reference/rest-api.json)
- [Read-only SQL asset index](assets/README.md)
