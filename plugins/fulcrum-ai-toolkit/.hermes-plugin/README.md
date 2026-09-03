# Fulcrum AI Toolkit — Hermes Plugin

Portable AI skills for Fulcrum app building, integrations, mapping, queries,
access, migrations, and field operations.

The plugin uses the portable Agent Skills format and bundles its skills in the
plugin's `skills/` directory.

## Installation

```bash
hermes plugin install fulcrum-ai-toolkit
```

## Skills

The plugin loads all 16 portable skills from `skills/`:

- **fulcrum-product-knowledge** — Route platform, plan, public AI, offline, and connector-boundary questions
- **fulcrum-integration-patterns** — Select Workflows, webhooks, URL Actions, REST, and middleware patterns
- **fulcrum-gis-mapping** — Verify layer, geometry, GIS, and online/offline mapping support
- **fulcrum-query-api** — Model read-only SQL from current Query API metadata
- **fulcrum-access-management** — Design roles, resource access, memberships, and SSO/SCIM lifecycle
- **fulcrum-data-migration** — Assess and design migrations, dry runs, reconciliation, cutover, and rollback
- **fulcrum-app-builder** — Guide discovery, schema approval, App MCP builds, and handoffs
- **fulcrum-app-design** — Structure apps, select field types, and design linked-app patterns
- **fulcrum-app-goal** — Define each app's goal, deliverable, and audience
- **fulcrum-data-events** — Write, review, and debug Data Events
- **fulcrum-app-extensions** — Build custom UIs embedded inside records
- **fulcrum-report-building** — Author and debug Report Templates
- **fulcrum-workflow-decomposition** — Break monolithic apps into composable pieces
- **fulcrum-safety** — Flag missing safety steps in field workflows
- **fulcrum-discovery** — Run structured discovery before building
- **fulcrum-solution-document** — Document completed solutions and review privacy

## References

- [Agent Skills specification](https://agentskills.io/specification)
- [Fulcrum developer documentation](https://docs.fulcrumapp.com/)
- [Hermes plugin configuration](https://github.com/NousResearch/hermes-agent)
