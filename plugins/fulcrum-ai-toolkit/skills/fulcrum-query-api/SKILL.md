---
name: fulcrum-query-api
description: Model safe read-only Fulcrum Query API work. Use for system, app, repeatable, link, and media tables; metadata discovery; parameterization; documented PostgreSQL/PostGIS analysis; and Query execution boundaries.
---

# Fulcrum Query API

Design a read-only query from discovered metadata, document safe parameters,
and hand execution to an authorized Query API client outside App MCP.

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
2. Metadata discovered from the target organization for actual table and column
   names.
3. Public OpenAPI for the query endpoint request shape.
4. Live App MCP schemas only to confirm that Query execution is not present.

> Source: [Query API introduction](https://docs.fulcrumapp.com/reference/query-intro)
> and [POST Query](https://docs.fulcrumapp.com/reference/query-post).

## Workflow

1. **Define the result.** Specify grain, fields, filters, time semantics, spatial
   needs, format, expected cardinality, and freshness.
2. **Discover metadata.** Start with the current table catalog and inspect the
   target tables. Never derive SQL identifiers solely from display labels or
   stale examples.
3. **Model relationships.** Use
   [`query-modeling-reference.md`](resources/query-modeling-reference.md) to
   distinguish system, form, repeatable, link, and media tables and select
   explicit join keys.
4. **Separate identifiers from values.** The Query endpoint accepts one complete
   SQL string in `q`; it does not expose server-side bind parameters. Allowlist
   discovered table/column identifiers. For dynamic values, require a reviewed,
   type-specific SQL-literal encoder in caller code. If no suitable encoder
   exists, stop rather than interpolating untrusted input.
   > Source: [POST Query request schema](https://docs.fulcrumapp.com/reference/query-post)
   > defines `q`, `format`, and `table_name` and no bind-parameter field.
5. **Constrain the query.** Select only required columns, bound time/space,
   paginate where supported, and inspect the plan/cost before broad production
   use.
6. **Validate safely.** Test with non-sensitive data and compare counts,
   nullability, duplicates, parent-child cardinality, geometry, and response
   format against an independent sample.
7. **Hand off execution.** Provide the SQL design, identifier allowlist,
   literal-encoding contract, expected output, and reconciliation checks to an
   authorized Query API client.

## App MCP Boundary

Query API execution is outside App MCP. Do not invent a Query tool or route SQL
through an unrelated App MCP operation. If no authorized Query API client is
available, stop with a reviewable query design and execution instructions.

> Connector authority: Live installed App MCP schemas define its
> app-configuration scope and data-level exclusions.

## Confirmation, Privacy, And Failure

Read-only access still exposes sensitive tenant data. Minimize columns and rows,
keep tokens out of query text and logs, and do not paste production results into
public tools. Require separate explicit authorization before using result IDs in
any REST mutation.

If metadata, permissions, plan access, spatial support, or safe literal
encoding is unknown, do not guess. Report the failed assumption, retain the
read-only boundary, and provide the smallest discovery step needed.

## References

- [Query API introduction](https://docs.fulcrumapp.com/reference/query-intro)
- [POST Query](https://docs.fulcrumapp.com/reference/query-post)
- [Fulcrum Query functions](https://docs.fulcrumapp.com/reference/query-functions)
- [Fulcrum public OpenAPI](https://raw.githubusercontent.com/fulcrumapp/api/v2/reference/rest-api.json)
