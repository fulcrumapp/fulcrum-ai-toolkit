# Legacy Product-Knowledge Migration Coverage

This manifest governs the migration of the legacy Fulcrum product-knowledge
skill into smaller, public, repository-native skills and resources. It is a
coverage record, not a product specification. A row marked `focused-skill`
identifies a portable skill now included in the package.

> **Inventory fingerprint:** The heading inventory was adapted from the user-supplied
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
and surface the discrepancy for review. Each focused rewrite must retain a
nearby `Source:` note for copied or materially adapted documentation.

## Dispositions

- `existing`: an existing public toolkit skill already owns the domain.
- `move`: retain the public material, but relocate or index it in the named
  canonical resource.
- `rewrite-around-app-mcp`: preserve intent while resolving tool contracts from
  the live App MCP schema at runtime.
- `focused-skill`: the named focused skill is the canonical public owner.
- `private-or-drop`: keep only in a private companion when justified; otherwise
  omit it.

## Coverage map

| Legacy section | Disposition | Canonical target skill/resource | Public source documentation | Freshness or security caveat |
| --- | --- | --- | --- | --- |
| **Platform overview** — What Fulcrum is; What Fulcrum is not | `existing` | [`fulcrum-product-knowledge`](../skills/fulcrum-product-knowledge/SKILL.md) for platform boundaries; [`fulcrum-discovery`](../skills/fulcrum-discovery/SKILL.md) for expectation checks | [Developer documentation](https://docs.fulcrumapp.com/) | Treat positioning and certification claims as time-sensitive. Do not migrate unsourced marketing, service-ownership, or hosting claims. |
| **Plans and licensing** — tiers; key plan gates | `move` | [`fulcrum-product-knowledge`](../skills/fulcrum-product-knowledge/SKILL.md) and [`plan-and-licensing-reference.md`](../skills/fulcrum-product-knowledge/resources/plan-and-licensing-reference.md) | [Fulcrum pricing](https://www.fulcrumapp.com/pricing) | Pricing is the only authority for plan gates. Do not preserve legacy trial, quota, sales-process, or upgrade assertions without a current public source. |
| **Field types** — Apps; field-type groups; common field options | `existing` | [`fulcrum-app-design`](../skills/fulcrum-app-design/SKILL.md) and [`field-type-reference.md`](../skills/fulcrum-app-design/resources/field-type-reference.md) | [Forms API introduction](https://docs.fulcrumapp.com/reference/forms-intro) | Field schemas and option names can change. Use public docs or live form schemas rather than legacy prose. |
| **App architecture** — core design principle; Repeatables versus Record Links; limits; anti-patterns | `existing` | [`fulcrum-app-design`](../skills/fulcrum-app-design/SKILL.md) and [`fulcrum-workflow-decomposition`](../skills/fulcrum-workflow-decomposition/SKILL.md) | [Repeatables and Record Links comparison](https://help.fulcrumapp.com/en/articles/74922-repeatables-record-links-comparison) | Clearly label toolkit heuristics as guidance, not platform limits. Revalidate numerical limits before presenting them as enforced behavior. |
| **Data Events** — online/offline behavior; event listeners; functions; gotchas; reusable patterns | `existing` | [`fulcrum-data-events`](../skills/fulcrum-data-events/SKILL.md) and its sourced runtime resources | [Data Events reference](https://docs.fulcrumapp.com/docs/data-events-reference), [`LOADFILE()` reference](https://docs.fulcrumapp.com/docs/data-events-loadfile) | Data Events are stored in a form's `script`; App MCP does not expose standalone Data Event CRUD. Never use client-side scripts as authorization or embed credentials in them. |
| **Workflows** — operation; webhook behavior; global webhooks; rate limits | `focused-skill` | [`fulcrum-integration-patterns`](../skills/fulcrum-integration-patterns/SKILL.md) and [`integration-selection-reference.md`](../skills/fulcrum-integration-patterns/resources/integration-selection-reference.md) | [Workflows API](https://docs.fulcrumapp.com/reference/workflows-api), [webhooks](https://docs.fulcrumapp.com/docs/webhooks) | Revalidate triggers, payloads, authentication, timeouts, imports, and rate limits. Do not carry forward unsourced fixed quotas. |
| **Reporting** — report types; HTML custom UIs; backend-service pattern; mistakes | `existing` | [`fulcrum-report-building`](../skills/fulcrum-report-building/SKILL.md) and [`report-template-reference.md`](../skills/fulcrum-report-building/resources/report-template-reference.md) | [Reports introduction](https://docs.fulcrumapp.com/docs/reports-introduction), [report functions](https://docs.fulcrumapp.com/docs/functions) | Keep private deployment procedures and unsupported browser-state or feature-flag techniques out of the public skill. Never place tokens in templates. |
| **App Extensions** — use cases; offline support; data exchange; extension-versus-event choice | `existing` | [`fulcrum-app-extensions`](../skills/fulcrum-app-extensions/SKILL.md) and [`extension-bridge-api.md`](../skills/fulcrum-app-extensions/resources/extension-bridge-api.md) | [App Extensions introduction](https://docs.fulcrumapp.com/docs/app-extensions-introduction), [offline capabilities](https://docs.fulcrumapp.com/docs/offline-capabilities) | Verify bridge APIs against public docs. External assets are an offline and supply-chain risk; pin versions and never embed secrets. |
| **MCP tools and build flow** — tool surface; create/update sequence; choice lists; extensions; webhooks; expression references; destructive operations | `rewrite-around-app-mcp` | [`fulcrum-app-builder`](../skills/fulcrum-app-builder/SKILL.md) for orchestration and [`fulcrum-product-knowledge`](../skills/fulcrum-product-knowledge/SKILL.md) for cross-cutting safety | [OpenAPI and Postman collection](https://docs.fulcrumapp.com/reference/openapi-and-postman-collection), [forms API](https://docs.fulcrumapp.com/reference/forms-intro) | Live App MCP schemas govern connector operations. App MCP covers app configuration and knowledge, but not Query API execution, record CRUD, or media CRUD. Existing-form updates must preserve element and choice keys. Confirm destructive actions explicitly. |
| **Integrations** — decision framework; webhook requirements; repeatable payloads; middleware; URL Actions | `focused-skill` | [`fulcrum-integration-patterns`](../skills/fulcrum-integration-patterns/SKILL.md) and [`integration-selection-reference.md`](../skills/fulcrum-integration-patterns/resources/integration-selection-reference.md) | [Webhooks](https://docs.fulcrumapp.com/docs/webhooks), [URL Actions](https://docs.fulcrumapp.com/docs/url-actions), [REST API introduction](https://docs.fulcrumapp.com/reference/rest-api-intro) | Authentication, retries, timeout behavior, and payload contracts require current public sources. Examples must use neutral systems and placeholders. |
| **Integrations** — private middleware infrastructure; browser-network discovery techniques; internal patterns index | `private-or-drop` | Private companion only | None; intentionally excluded from the public toolkit | Do not publish private infrastructure, repository inventories, undocumented parameters, or techniques for bypassing supported interfaces. |
| **GIS and mapping** — basemaps; layer types; ArcGIS connectivity; selection tools; geometry; GIS import/export | `focused-skill` | [`fulcrum-gis-mapping`](../skills/fulcrum-gis-mapping/SKILL.md) and [`mapping-capability-reference.md`](../skills/fulcrum-gis-mapping/resources/mapping-capability-reference.md) | [Layers API introduction](https://docs.fulcrumapp.com/reference/layers-intro), [creating map layers](https://help.fulcrumapp.com/en/articles/94241-creating-map-layers) | Web, mobile, and offline matrices are especially volatile. Recheck formats, edit support, early-access status, projections, and import limits. |
| **GIS and mapping** — internal positioning and private integration guidance | `private-or-drop` | Private companion only | None; intentionally excluded from the public toolkit | Do not publish customer positioning, private integration runbooks, or claims derived only from internal experience. |
| **Query API** — database structure; system and app tables; repeatable joins; PostGIS; metadata; report queries; mistakes | `focused-skill` | [`fulcrum-query-api`](../skills/fulcrum-query-api/SKILL.md) and [`query-modeling-reference.md`](../skills/fulcrum-query-api/resources/query-modeling-reference.md) | [Query API introduction](https://docs.fulcrumapp.com/reference/query-intro), [Query API endpoint](https://docs.fulcrumapp.com/reference/query-post) | Validate table and column names against current public Query API docs. Sanitize inputs and do not imply write access. |
| **Users, roles, SSO, and SCIM** — system/custom roles; two-level permissions; SSO; provisioning; user conversion | `focused-skill` | [`fulcrum-access-management`](../skills/fulcrum-access-management/SKILL.md) and [`access-control-reference.md`](../skills/fulcrum-access-management/resources/access-control-reference.md) | [System roles](https://help.fulcrumapp.com/en/articles/94343-what-is-the-purpose-of-the-system-role-types), [role permissions](https://help.fulcrumapp.com/en/articles/2286638-role-permission-definitions), [SSO and provisioning](https://help.fulcrumapp.com/en/articles/4038490-how-do-i-set-up-single-sign-on-and-user-provisioning) | Identity-provider and plan behavior changes. Keep tenant-specific migration procedures, identities, and access details private. |
| **Data migration** — identity changes; cutover risks; stable public migration contract | `focused-skill` | [`fulcrum-data-migration`](../skills/fulcrum-data-migration/SKILL.md) and [`migration-assessment-reference.md`](../skills/fulcrum-data-migration/resources/migration-assessment-reference.md) | [Working with other Fulcrum instances](https://docs.fulcrumapp.com/reference/working-with-other-instances), [REST API introduction](https://docs.fulcrumapp.com/reference/rest-api-intro) | Public sources do not establish a complete organization-migration contract. Reverify IDs, history, timestamps, attribution, tokens, and URLs for each migration. |
| **Data migration** — operational runbook; instance-switching procedure | `private-or-drop` | Private companion only | None; intentionally excluded from the public toolkit | Do not publish tenant cutover instructions, hidden controls, operational coordination details, or unsupported access techniques. |
| **AI** — Audio FastFill; Insights; face blurring; custom inference | `move` | Thin [`fulcrum-product-knowledge`](../skills/fulcrum-product-knowledge/SKILL.md) routing plus [`public-ai-capabilities.md`](../skills/fulcrum-product-knowledge/resources/public-ai-capabilities.md) | [`INFERENCE()` documentation](https://docs.fulcrumapp.com/docs/data-events-inference), [Audio FastFill](https://help.fulcrumapp.com/en/articles/10074106-audio-fastfill), [Insights](https://help.fulcrumapp.com/en/articles/11586112-insights-beta), [face distortion](https://help.fulcrumapp.com/en/articles/4806048-mobile-face-distortion-for-photos), [Fulcrum pricing](https://www.fulcrumapp.com/pricing) | Capabilities, connectivity, privacy behavior, performance claims, beta status, and plan gates are volatile. Require a current public source for each feature claim. |
| **AI** — roadmap direction | `private-or-drop` | Private companion only | None; intentionally excluded from the public toolkit | Do not publish forward-looking statements from a legacy snapshot. Only documented, currently available behavior belongs in public skills. |
| **Sidecars and internal tools** — internal application and repository inventory | `private-or-drop` | Private companion catalog only | None; intentionally excluded from the public toolkit | Do not include private repositories, deployment locations, internal ownership, customer delivery details, or access paths. Public sidecar guidance must be generic. |
| **Common misconceptions** — platform, workflow, reporting, GIS, repeatable, offline, and service-ownership boundaries | `existing` | [`fulcrum-discovery`](../skills/fulcrum-discovery/SKILL.md) for pre-build checks and [`fulcrum-product-knowledge`](../skills/fulcrum-product-knowledge/SKILL.md) for sourced boundaries | [Developer documentation](https://docs.fulcrumapp.com/), [offline capabilities](https://docs.fulcrumapp.com/docs/offline-capabilities) | Keep only misconceptions that public documentation can resolve. Remove organization-specific service promises and anecdotal claims. |
| **Source index** — public help, developer, Data Events, reporting, Query API, REST API, webhook, URL Action, extension, pricing, role, and SSO sources | `move` | [`llms-txt-index.md`](../skills/fulcrum-product-knowledge/resources/llms-txt-index.md), [`resource-governance.md`](../skills/fulcrum-product-knowledge/resources/resource-governance.md), this manifest, and the named public OpenAPI contract | [Fulcrum developer `llms.txt`](https://docs.fulcrumapp.com/llms.txt), [public OpenAPI](https://raw.githubusercontent.com/fulcrumapp/api/v2/reference/rest-api.json), [OpenAPI documentation](https://docs.fulcrumapp.com/reference/openapi-and-postman-collection) | The heavyweight vendored REST contract is retired. Keep compact selected indexes and offline resources only when they name their public upstream and refresh expectations. |

## Public-repository boundary

This public package intentionally excludes tenant data, credentials, personal
identities, customer-specific examples, private collaboration locations,
private repository inventories, internal deployment details, unsupported
feature-enablement techniques, and forward-looking product statements. Any
separately controlled private companion remains outside this public package and
is not linked from distributable content.
