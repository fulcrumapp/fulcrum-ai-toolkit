# Legacy Product-Knowledge Migration Coverage

This manifest governs the migration of the legacy Fulcrum product-knowledge
skill into smaller, public, repository-native skills and resources. It is a
coverage plan, not a product specification. A row marked `new-skill` identifies
a future extraction; it does not add that skill to the current package.

> **Source:** The heading inventory was adapted from the user-supplied
> `legacy-product-knowledge-skill.md` artifact. No public URL was supplied for
> that artifact, and the original file is intentionally not committed.
> SHA-256:
> `274e73e1ea09910244821d809fa9b3427240d20b6f3b5133acb7c81b0912a7b5`.

## Source hierarchy

Use sources in this order, according to the fact being established:

1. **Live Fulcrum App MCP tool schemas** are authoritative for connector tool
   names, arguments, required fields, and response shapes. Never freeze a tool
   inventory from the legacy artifact into a portable skill.
2. **Public Fulcrum documentation and the public OpenAPI document** are
   authoritative for platform behavior, API resources, limits, and supported
   workflows.
3. **Public Fulcrum pricing** is authoritative for current plan and licensing
   gates. Recheck it when answering or implementing a plan-sensitive workflow.
4. **Private or internal documentation** belongs only in a separately
   controlled private companion. It must not be copied, linked, summarized as
   public fact, or used to override public documentation in this repository.

If sources disagree, do not blend them. Use the live schema only for the
connector contract, use public product documentation for platform behavior,
and surface the discrepancy for review. Each future rewrite should retain a
nearby `Source:` note for copied or materially adapted documentation.

## Dispositions

- `existing`: an existing public toolkit skill already owns the domain.
- `move`: retain the public material, but relocate or index it in the named
  canonical resource.
- `rewrite-around-app-mcp`: preserve intent while resolving tool contracts from
  the live App MCP schema at runtime.
- `new-skill`: create the named focused skill in a later stack layer.
- `private-or-drop`: keep only in a private companion when justified; otherwise
  omit it.

## Coverage map

| Legacy section | Disposition | Canonical target skill/resource | Public source documentation | Freshness or security caveat |
| --- | --- | --- | --- | --- |
| **Platform overview** — What Fulcrum is; What Fulcrum is not | `existing` | [`fulcrum-product-knowledge`](../skills/fulcrum-product-knowledge/SKILL.md) for platform boundaries; [`fulcrum-discovery`](../skills/fulcrum-discovery/SKILL.md) for expectation checks | [Developer documentation](https://docs.fulcrumapp.com/) | Treat positioning and certification claims as time-sensitive. Do not migrate unsourced marketing, service-ownership, or hosting claims. |
| **Plans and licensing** — tiers; key plan gates | `move` | [`fulcrum-product-knowledge`](../skills/fulcrum-product-knowledge/SKILL.md), with a future sourced plan-gates resource if detail is needed | [Fulcrum pricing](https://www.fulcrumapp.com/pricing) | Pricing is the only authority for plan gates. Do not preserve legacy trial, quota, sales-process, or upgrade assertions without a current public source. |
| **Field types** — Apps; field-type groups; common field options | `existing` | [`fulcrum-app-design`](../skills/fulcrum-app-design/SKILL.md) and [`field-type-reference.md`](../skills/fulcrum-app-design/resources/field-type-reference.md) | [Forms API introduction](https://docs.fulcrumapp.com/reference/forms-intro) | Field schemas and option names can change. Use public docs or live form schemas rather than legacy prose. |
| **App architecture** — core design principle; Repeatables versus Record Links; limits; anti-patterns | `existing` | [`fulcrum-app-design`](../skills/fulcrum-app-design/SKILL.md) and [`fulcrum-workflow-decomposition`](../skills/fulcrum-workflow-decomposition/SKILL.md) | [Repeatables and Record Links comparison](https://help.fulcrumapp.com/en/articles/74922-repeatables-record-links-comparison) | Clearly label toolkit heuristics as guidance, not platform limits. Revalidate numerical limits before presenting them as enforced behavior. |
| **Data Events** — online/offline behavior; event listeners; functions; gotchas; reusable patterns | `existing` | [`fulcrum-data-events`](../skills/fulcrum-data-events/SKILL.md) and its sourced runtime resources | [Data Events reference](https://docs.fulcrumapp.com/docs/data-events-reference) | Function names and signatures come from current public docs. Never use client-side scripts as authorization or embed credentials in them. |
| **Workflows** — operation; webhook behavior; global webhooks; rate limits | `new-skill` | Planned `fulcrum-workflows`; interim cross-cutting summary remains in [`fulcrum-product-knowledge`](../skills/fulcrum-product-knowledge/SKILL.md) | [Workflows API](https://docs.fulcrumapp.com/reference/workflows-api), [webhooks](https://docs.fulcrumapp.com/docs/webhooks) | Revalidate triggers, payloads, authentication, timeouts, imports, and rate limits. Do not carry forward unsourced fixed quotas. |
| **Reporting** — report types; HTML custom UIs; backend-service pattern; mistakes | `existing` | [`fulcrum-report-building`](../skills/fulcrum-report-building/SKILL.md) and [`report-template-reference.md`](../skills/fulcrum-report-building/resources/report-template-reference.md) | [Reports introduction](https://docs.fulcrumapp.com/docs/reports-introduction), [report functions](https://docs.fulcrumapp.com/docs/functions) | Keep private deployment procedures and unsupported browser-state or feature-flag techniques out of the public skill. Never place tokens in templates. |
| **App Extensions** — use cases; offline support; data exchange; extension-versus-event choice | `existing` | [`fulcrum-app-extensions`](../skills/fulcrum-app-extensions/SKILL.md) and [`extension-bridge-api.md`](../skills/fulcrum-app-extensions/resources/extension-bridge-api.md) | [App Extensions introduction](https://docs.fulcrumapp.com/docs/app-extensions-introduction), [offline capabilities](https://docs.fulcrumapp.com/docs/offline-capabilities) | Verify bridge APIs against public docs. External assets are an offline and supply-chain risk; pin versions and never embed secrets. |
| **MCP tools and build flow** — tool surface; create/update sequence; choice lists; extensions; webhooks; expression references; destructive operations | `rewrite-around-app-mcp` | [`fulcrum-app-builder`](../skills/fulcrum-app-builder/SKILL.md) for orchestration and [`fulcrum-product-knowledge`](../skills/fulcrum-product-knowledge/SKILL.md) for cross-cutting safety | [OpenAPI and Postman collection](https://docs.fulcrumapp.com/reference/openapi-and-postman-collection), [forms API](https://docs.fulcrumapp.com/reference/forms-intro) | Discover exact tool names and arguments from the live App MCP schema. A connector may be absent or expose a different surface. Confirm destructive actions explicitly. |
| **Integrations** — decision framework; webhook requirements; repeatable payloads; middleware; URL Actions | `new-skill` | Planned `fulcrum-integration-patterns`; interim guidance remains in [`fulcrum-product-knowledge`](../skills/fulcrum-product-knowledge/SKILL.md) | [Webhooks](https://docs.fulcrumapp.com/docs/webhooks), [URL Actions](https://docs.fulcrumapp.com/docs/url-actions), [REST API introduction](https://docs.fulcrumapp.com/reference/rest-api-intro) | Authentication, retries, timeout behavior, and payload contracts require current public sources. Examples must use neutral systems and placeholders. |
| **Integrations** — private middleware infrastructure; browser-network discovery techniques; internal patterns index | `private-or-drop` | Private companion only | None; intentionally excluded from the public toolkit | Do not publish private infrastructure, repository inventories, undocumented parameters, or techniques for bypassing supported interfaces. |
| **GIS and mapping** — basemaps; layer types; ArcGIS connectivity; selection tools; geometry; GIS import/export | `new-skill` | Planned `fulcrum-gis-mapping`; interim summary remains in [`fulcrum-product-knowledge`](../skills/fulcrum-product-knowledge/SKILL.md) | [Layers API introduction](https://docs.fulcrumapp.com/reference/layers-intro), [offline capabilities](https://docs.fulcrumapp.com/docs/offline-capabilities) | Web, mobile, and offline matrices are especially volatile. Recheck formats, edit support, early-access status, projections, and import limits. |
| **GIS and mapping** — internal positioning and private integration guidance | `private-or-drop` | Private companion only | None; intentionally excluded from the public toolkit | Do not publish customer positioning, private integration runbooks, or claims derived only from internal experience. |
| **Query API** — database structure; system and app tables; repeatable joins; PostGIS; metadata; report queries; mistakes | `new-skill` | Planned `fulcrum-query-api`; interim summary remains in [`fulcrum-product-knowledge`](../skills/fulcrum-product-knowledge/SKILL.md) | [Query API introduction](https://docs.fulcrumapp.com/reference/query-intro), [Query API endpoint](https://docs.fulcrumapp.com/reference/query-post) | Validate table and column names against current public Query API docs. Sanitize inputs and do not imply write access. |
| **Users, roles, SSO, and SCIM** — system/custom roles; two-level permissions; SSO; provisioning; user conversion | `new-skill` | Planned `fulcrum-enterprise-administration`; interim summary remains in [`fulcrum-product-knowledge`](../skills/fulcrum-product-knowledge/SKILL.md) | [System roles](https://help.fulcrumapp.com/en/articles/94343-what-is-the-purpose-of-the-system-role-types), [role permissions](https://help.fulcrumapp.com/en/articles/2286638-role-permission-definitions), [SSO and provisioning](https://help.fulcrumapp.com/en/articles/4038490-how-do-i-set-up-single-sign-on-and-user-provisioning) | Identity-provider and plan behavior changes. Keep tenant-specific migration procedures, identities, and access details private. |
| **Data migration** — identity changes; cutover risks; stable public migration contract | `new-skill` | Planned `fulcrum-data-migration`; until then, retain only a high-level caution in [`fulcrum-product-knowledge`](../skills/fulcrum-product-knowledge/SKILL.md) | [Working with other Fulcrum instances](https://docs.fulcrumapp.com/reference/working-with-other-instances), [REST API introduction](https://docs.fulcrumapp.com/reference/rest-api-intro) | Public sources do not establish a complete organization-migration contract. Reverify IDs, history, timestamps, attribution, tokens, and URLs for each migration. |
| **Data migration** — operational runbook; instance-switching procedure | `private-or-drop` | Private companion only | None; intentionally excluded from the public toolkit | Do not publish tenant cutover instructions, hidden controls, operational coordination details, or unsupported access techniques. |
| **AI** — Audio FastFill; Insights; face blurring; custom inference | `new-skill` | Planned `fulcrum-ai-capabilities`; interim summary remains in [`fulcrum-product-knowledge`](../skills/fulcrum-product-knowledge/SKILL.md) | [`INFERENCE()` documentation](https://docs.fulcrumapp.com/docs/data-events-inference), [Fulcrum pricing](https://www.fulcrumapp.com/pricing) | Capabilities, connectivity, privacy behavior, performance claims, and plan gates are volatile. Require a current public source for each feature claim. |
| **AI** — roadmap direction | `private-or-drop` | Private companion only | None; intentionally excluded from the public toolkit | Do not publish forward-looking statements from a legacy snapshot. Only documented, currently available behavior belongs in public skills. |
| **Sidecars and internal tools** — internal application and repository inventory | `private-or-drop` | Private companion catalog only | None; intentionally excluded from the public toolkit | Do not include private repositories, deployment locations, internal ownership, customer delivery details, or access paths. Public sidecar guidance must be generic. |
| **Common misconceptions** — platform, workflow, reporting, GIS, repeatable, offline, and service-ownership boundaries | `existing` | [`fulcrum-discovery`](../skills/fulcrum-discovery/SKILL.md) for pre-build checks and [`fulcrum-product-knowledge`](../skills/fulcrum-product-knowledge/SKILL.md) for sourced boundaries | [Developer documentation](https://docs.fulcrumapp.com/), [offline capabilities](https://docs.fulcrumapp.com/docs/offline-capabilities) | Keep only misconceptions that public documentation can resolve. Remove organization-specific service promises and anecdotal claims. |
| **Source index** — public help, developer, Data Events, reporting, Query API, REST API, webhook, URL Action, extension, pricing, role, and SSO sources | `move` | [`llms-txt-index.md`](../skills/fulcrum-product-knowledge/resources/llms-txt-index.md), the sourced [`fulcrum-rest-api.json`](../skills/fulcrum-product-knowledge/resources/fulcrum-rest-api.json), and this manifest | [Fulcrum developer `llms.txt`](https://docs.fulcrumapp.com/llms.txt), [public OpenAPI](https://raw.githubusercontent.com/fulcrumapp/api/v2/reference/rest-api.json) | Keep only public URLs. Refresh generated indexes from their named upstream sources; never add private collaboration or repository links. |

## Public-repository boundary

This public package intentionally excludes tenant data, credentials, personal
identities, customer-specific examples, private collaboration locations,
private repository inventories, internal deployment details, unsupported
feature-enablement techniques, and forward-looking product statements. If a
future migration needs any of that context, create a separately access-controlled
companion and link to it only from an appropriate private environment.
