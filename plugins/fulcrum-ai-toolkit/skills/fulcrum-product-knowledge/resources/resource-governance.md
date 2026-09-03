# Public Resource Governance

> Source: [Fulcrum public OpenAPI](https://raw.githubusercontent.com/fulcrumapp/api/v2/reference/rest-api.json),
> [Fulcrum developer documentation](https://docs.fulcrumapp.com/), and
> [OpenAPI and Postman collection](https://docs.fulcrumapp.com/reference/openapi-and-postman-collection).

- Prefer a named authoritative public link over a copied upstream document.
  Public OpenAPI governs REST behavior; live installed App MCP schemas govern
  connector names and arguments.
- Keep a compact local index or focused fallback only when it materially helps
  offline discovery. Name its upstream source and selection or verification date,
  and refresh it before relying on completeness or volatile claims.
- Treat packaged copies as maintenance and privacy liabilities: they become
  stale, increase distribution size, and can preserve content that no longer
  belongs in a public package.
- Review exceptions explicitly. A local resource must have an owning skill,
  a public source, an offline need that a link cannot satisfy, and a size
  proportionate to that need. Any distributable plugin file over 100 KB requires
  a named, reviewed exception in the resource contract with its offline
  rationale. Generated or authoritative snapshots do not qualify.
