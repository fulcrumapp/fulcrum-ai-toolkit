---
name: fulcrum-product-knowledge
description: Route cross-cutting Fulcrum platform questions to the owning portable skill or current public source. Use for capability boundaries, plan checks, public AI capabilities, offline constraints, and App MCP scope.
---

# Fulcrum Product Knowledge Router

Use this skill to select the smallest authoritative Fulcrum workflow. Do not
answer a focused domain question from this router when an owning skill exists.

> Source: [Fulcrum developer documentation](https://docs.fulcrumapp.com/) is
> authoritative for public platform behavior. [Fulcrum pricing](https://www.fulcrumapp.com/pricing/)
> is authoritative for current plan gates.

## Route The Request

| Request | Canonical destination |
| --- | --- |
| Integration selection, Workflows, webhooks, URL Actions, REST integration, or middleware | [`fulcrum-integration-patterns`](../fulcrum-integration-patterns/SKILL.md) |
| GIS, layers, basemaps, ArcGIS, geometry, or spatial import/export | [`fulcrum-gis-mapping`](../fulcrum-gis-mapping/SKILL.md) |
| Read-only SQL, Query API tables, repeatables, metadata, or PostGIS | [`fulcrum-query-api`](../fulcrum-query-api/SKILL.md) |
| Roles, permissions, memberships, SSO, SCIM, or least privilege | [`fulcrum-access-management`](../fulcrum-access-management/SKILL.md) |
| Migration discovery, mapping, reconciliation, cutover design, or rollback | [`fulcrum-data-migration`](../fulcrum-data-migration/SKILL.md) |
| App shape, field types, repeatables, Record Links, or choice design | [`fulcrum-app-design`](../fulcrum-app-design/SKILL.md) |
| Discovery, feasibility, expectations, or pre-build requirements | [`fulcrum-discovery`](../fulcrum-discovery/SKILL.md) |
| Goal and deliverable definition | [`fulcrum-app-goal`](../fulcrum-app-goal/SKILL.md) |
| Approved schema construction or App MCP orchestration | [`fulcrum-app-builder`](../fulcrum-app-builder/SKILL.md) |
| Data Event runtime behavior or code | [`fulcrum-data-events`](../fulcrum-data-events/SKILL.md) |
| Custom in-record UI | [`fulcrum-app-extensions`](../fulcrum-app-extensions/SKILL.md) |
| Report Template design or rendering | [`fulcrum-report-building`](../fulcrum-report-building/SKILL.md) |
| Monolithic workflow decomposition | [`fulcrum-workflow-decomposition`](../fulcrum-workflow-decomposition/SKILL.md) |
| Field-work hazards | [`fulcrum-safety`](../fulcrum-safety/SKILL.md) |
| Post-build documentation | [`fulcrum-solution-document`](../fulcrum-solution-document/SKILL.md) |

When a host supplies shared `field-choice-optimizer` or `feasibility-check`
workflows, route those requests there rather than duplicating them. Otherwise,
use `fulcrum-app-design` for field choices and `fulcrum-discovery` for
feasibility.

## Keep Only Cross-Cutting Facts Here

- **Plan and licensing gates:** use
  [`plan-and-licensing-reference.md`](resources/plan-and-licensing-reference.md)
  and recheck pricing before making a plan-sensitive recommendation.
- **Public AI capabilities:** use
  [`public-ai-capabilities.md`](resources/public-ai-capabilities.md) and preserve
  beta, connectivity, device, privacy, and plan caveats from the current source.
- **Offline behavior:** resolve it in the owning runtime, integration, mapping,
  or extension skill. Do not infer offline support from a feature name.
- **Source discovery:** use [`llms-txt-index.md`](resources/llms-txt-index.md)
  to find public Fulcrum documentation, then open the current source.

## Authority And App MCP Boundary

Use live installed App MCP schemas for connector names, arguments, required
fields, and response shapes. Use public Fulcrum docs/OpenAPI for product and API
behavior, and pricing for plan gates. If these sources disagree, do not blend
them; report the discrepancy and identify which authority governs each claim.

App MCP is an app-configuration control plane. Query API execution, record CRUD, and media CRUD remain outside App MCP. The focused skills describe additional
read-only and destructive boundaries. Never infer an unregistered tool or claim
an action ran when no authorized connector is available.

> Connector authority: Live installed App MCP schemas define the connector
> contract and take precedence over toolkit prose.

## Routing Workflow

1. Classify the request by outcome, affected resources, online/offline needs,
   and whether it asks for advice or execution.
2. Load the owning skill and only the focused resources needed for that request.
3. Verify volatile capability, plan, limit, and support claims against current
   public sources.
4. Resolve the live connector schema before any App MCP handoff.
5. Require explicit confirmation before deletion, access removal, activation,
   bulk mutation, or a migration cutover.
6. Return the decision, evidence, unresolved assumptions, and next authorized
   handoff. Never return success-shaped output after a failed or unavailable
   action.

## Public And Privacy Boundary

Use public URLs only. Do not expose credentials, tenant data, customer or
employee identities, private collaboration links, private repositories,
deployment details, unsupported feature-enablement techniques, private
migration runbooks, or roadmap statements.

## References

- [Fulcrum developer documentation](https://docs.fulcrumapp.com/)
- [Fulcrum public OpenAPI document](https://raw.githubusercontent.com/fulcrumapp/api/v2/reference/rest-api.json)
- [Fulcrum pricing](https://www.fulcrumapp.com/pricing/)
