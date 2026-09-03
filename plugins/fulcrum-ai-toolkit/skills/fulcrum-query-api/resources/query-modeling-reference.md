# Query Modeling Reference

## Discover Before Naming

The Query API exposes a table catalog. Discover the organization's current
tables and columns before composing a production query.

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

- Allowlist identifiers from metadata; value binding does not make a dynamic
  identifier safe.
- Bind values with the selected client when available.
- If the client cannot bind values, use a narrowly reviewed encoding strategy
  and do not accept raw SQL fragments.
- Keep credentials in the client's secret mechanism, never in SQL or a shared
  URL.
- Bound result size and execution time, and avoid `SELECT *` in durable queries.

## References

- [POST Query request contract](https://docs.fulcrumapp.com/reference/query-post)
- [Query API tools](https://docs.fulcrumapp.com/reference/query-intro#tools)
