---
name: fulcrum-gis-mapping
description: Select Fulcrum GIS and mapping capabilities. Use for layers, basemaps, ArcGIS, online/offline maps, geometry capture, spatial import/export, and current web/mobile support checks.
---

# Fulcrum GIS And Mapping

Turn a mapping requirement into a current, source-backed layer and data-flow
decision without freezing a volatile support matrix.

## When To Use

Use this skill for basemap or overlay selection, ArcGIS connectivity, offline
maps, layer permissions, geometry capture/editing, coordinate/projection
questions, and GIS import/export boundaries.

## When Not To Use

- Use [`fulcrum-query-api`](../fulcrum-query-api/SKILL.md) for spatial SQL.
- Use [`fulcrum-data-migration`](../fulcrum-data-migration/SKILL.md) for
  cross-system cutover and reconciliation.
- Use [`fulcrum-app-design`](../fulcrum-app-design/SKILL.md) for form structure.
- Do not preserve an early-access label, platform matrix, file limit, or support
  promise without reopening its current public source.

## Source Order

1. Live installed App MCP schemas for available layer inspection operations.
2. Current public help/developer docs for web, mobile, offline, layer,
   projection, geometry, import, and export behavior.
3. Public OpenAPI for layer resource shapes.
4. Pricing for plan-sensitive connectivity.

> Source: [Layers API](https://docs.fulcrumapp.com/reference/layers-intro),
> [Creating Map Layers](https://help.fulcrumapp.com/en/articles/94241-creating-map-layers),
> and [Fulcrum pricing](https://www.fulcrumapp.com/pricing/).

## Workflow

1. **Define the map job.** Separate basemap, reference overlay, editable
   operational data, geometry capture, search/selection, analysis, and export.
2. **Capture constraints.** Record target clients, offline duration, sync
   expectations, data sensitivity, extent, projection, geometry types, styling,
   source authentication, refresh frequency, and ownership.
3. **Recheck current support.** Use
   [`mapping-capability-reference.md`](resources/mapping-capability-reference.md)
   to locate the public source, then verify the exact layer type and client
   behavior today.
4. **Choose the representation.** Prefer Fulcrum app data for editable field
   records, a supported layer for reference context, and a documented
   import/export path for interchange. Do not imply two-way synchronization
   from display connectivity alone.
5. **Design access and offline behavior.** Verify layer permissions, group
   effects, download/sync steps, storage, stale-data behavior, and what users see
   when the source is unavailable.
6. **Plan validation.** Test projection, bounds, representative geometries,
   permissions, online/offline transitions, refresh, and export round-trips on
   each required client.

## App MCP Handoff

When registered and confirmed by the live schema, use `fulcrum_layers_list` and
`fulcrum_layers_get` for read-only layer inspection. The settled App MCP
contract does not expose layer create, update, delete, file upload, or
permission mutation. Hand those actions to the supported Fulcrum UI or another
explicitly authorized public API workflow.

> Connector authority: Live installed App MCP schemas take precedence over
> toolkit prose.

## Confirmation, Privacy, And Failure

Obtain confirmation before replacing or deleting a layer, changing access, or
running an import that can create/update records. Never publish private layer
URLs, access tokens, customer extents, or private service inventories.

If the required client/layer combination is undocumented, conflicting, or
early access, label it unverified and stop at a test plan. Do not convert an
anecdote into product support. Surface projection, permission, import, and
rendering failures with the source and client that produced them.

## References

- [Layers API](https://docs.fulcrumapp.com/reference/layers-intro)
- [Creating Map Layers](https://help.fulcrumapp.com/en/articles/94241-creating-map-layers)
- [Offline MBTiles Layers](https://help.fulcrumapp.com/en/articles/4351972-offline-mbtiles-layers)
- [Importing data](https://help.fulcrumapp.com/en/articles/69897-how-do-i-import-my-data-into-a-fulcrum-app)
- [Downloading or exporting data](https://help.fulcrumapp.com/en/articles/73547-how-to-download-or-export-data)
