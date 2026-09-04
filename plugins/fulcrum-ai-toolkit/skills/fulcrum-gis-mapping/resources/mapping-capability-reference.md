# Mapping Capability Reference

## Layer Selection

The public Layers API currently describes `fulcrum`, `xyz`, `tilejson`,
`geojson`, `mbtiles`, `wms`, and `feature-service` resource types. The public
help center documents additional UI/client details and can change independently.
Verify the intended creation path and client support in both sources.

> Source: [Layers API](https://docs.fulcrumapp.com/reference/layers-intro) and
> [Creating Map Layers](https://help.fulcrumapp.com/en/articles/94241-creating-map-layers).

Use these questions rather than a static matrix:

- Is the layer a basemap, reference overlay, or editable operational dataset?
- Must it work on web, iOS, Android, and/or offline?
- Is the source hosted, uploaded, or synchronized from another system?
- Does it require credentials, CORS, a projection conversion, styling, or a
  current early-access entitlement?
- Does "edit" mean editing a Fulcrum record, editing source GIS data, or
  round-trip synchronization?

## Offline Boundary

Public documentation identifies uploaded raster MBTiles as an offline map-layer
option. Other formats and client versions evolve; verify the exact web/mobile
and online/offline behavior in the current layer guide before selecting them.

> Source: [Offline MBTiles Layers](https://help.fulcrumapp.com/en/articles/4351972-offline-mbtiles-layers)
> and [Creating Map Layers](https://help.fulcrumapp.com/en/articles/94241-creating-map-layers).

## Geometry And Interchange

- Confirm coordinate order, projection, and supported geometry type before
  import.
- Treat selection tools, native symbology, geometry editing, and two-way GIS
  sync as distinct requirements; verify each rather than assuming a general GIS
  capability covers it.
- Use the current importer guide for supported input formats and validation.
- Use the current downloader/exporter guide for output formats, history, media,
  geometry, and size behavior.
- Test a representative round-trip and inspect geometry, attributes, stable
  keys, media associations, and precision.

> Source: [Importing data](https://help.fulcrumapp.com/en/articles/69897-how-do-i-import-my-data-into-a-fulcrum-app)
> and [Downloading or exporting data](https://help.fulcrumapp.com/en/articles/73547-how-to-download-or-export-data).

## References

- [Fulcrum maps and layers](https://help.fulcrumapp.com/en/collections/50422-maps-layers)
- [Fulcrum public OpenAPI](https://raw.githubusercontent.com/fulcrumapp/api/v2/reference/rest-api.json)
