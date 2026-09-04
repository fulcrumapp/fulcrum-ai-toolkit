---
name: fulcrum-data-migration
description: Assess and design supported Fulcrum data migrations. Use for inventory, identity and key mapping, history/timestamp/media/URL risk, dry runs, reconciliation, cutover, rollback, and public API boundaries.
---

# Fulcrum Data Migration

Produce a migration design and evidence plan using supported public interfaces.
This skill does not provide private tenant cutover runbooks or unsupported
instance-switching procedures.

## When To Use

Use this skill to assess a source/target move, map schemas and identities,
inventory history/media/URLs, design dry runs and reconciliation, and prepare a
reviewed cutover/rollback plan.

## When Not To Use

- Use [`fulcrum-gis-mapping`](../fulcrum-gis-mapping/SKILL.md) for a standalone
  spatial import/export decision.
- Use [`fulcrum-access-management`](../fulcrum-access-management/SKILL.md) for
  normal role or SSO lifecycle work.
- Do not use this skill to bypass supported interfaces, switch a private
  instance, expose tenant details, or promise that IDs/history/attribution will
  transfer.

## Source Order

1. Current public OpenAPI and endpoint documentation for supported resources and
   request/response shapes.
2. Current public import/export documentation for supported bulk paths.
3. Current public regional-instance documentation for API base URL selection.
4. Live source/target metadata and explicit migration requirements.
5. App MCP schemas only to enforce its non-migration boundaries.

> Source: [REST API introduction](https://docs.fulcrumapp.com/reference/rest-api-intro),
> [public OpenAPI](https://raw.githubusercontent.com/fulcrumapp/api/v2/reference/rest-api.json),
> and [working with other instances](https://docs.fulcrumapp.com/reference/working-with-other-instances).

## Workflow

1. **Define scope and acceptance.** Identify organizations, apps, records,
   repeatables, links, projects, assignments, media, history, users, layers,
   reports, integrations, downtime, retention, and compliance needs.
2. **Inventory source and target.** Use
   [`migration-assessment-reference.md`](resources/migration-assessment-reference.md)
   to classify each object as supported, transformed, recreated, referenced, or
   unresolved.
3. **Map stable identity.** Define source identifiers, destination identifiers,
   durable business keys, form/field/choice keys, user mapping, link mapping,
   duplicate policy, and URL replacement.
4. **Design extraction and load.** Choose only documented APIs/importers,
   sequence dependencies, preserve required metadata where supported, throttle
   safely, and isolate credentials.
5. **Dry run.** Use a representative, non-production subset. Record mappings,
   rejected rows, transformations, media checksums, counts, timestamps,
   geometry, links, permissions, and integration side effects.
6. **Reconcile.** Compare source/target counts and samples by object type,
   business key, history expectation, media checksum, geometry, assignment, and
   referential integrity.
7. **Plan cutover and rollback.** Define freeze window, delta capture,
   owner/approvers, go/no-go criteria, communications, credential rotation,
   webhook/workflow behavior, rollback boundary, and post-cutover monitoring.
8. **Require approval.** Do not execute production writes, deletion,
   deprovisioning, endpoint switching, or irreversible cleanup without explicit
   authorization and a successful dry-run review.

## App MCP Boundary

App MCP is not a migration executor. Query API execution, record CRUD, and media
CRUD are outside App MCP. Its app-configuration operations must not be treated
as a complete organization export/import or identity-preserving copy.

> Connector authority: Live installed App MCP schemas define the
> app-configuration scope and data-level exclusions.

## Confirmation, Privacy, And Failure

Keep credentials, organization identifiers, member identities, record data,
customer URLs, private repositories, internal deployment details, and cutover
coordination in an access-controlled plan, not this public package.

On an unsupported object, immutable identifier, history gap, media failure,
permission mismatch, or reconciliation variance, stop that object stream and
record the variance. Do not silently drop data, synthesize attribution, rewrite
timestamps without an approved rule, or declare success from aggregate counts
alone.

## References

- [REST API introduction](https://docs.fulcrumapp.com/reference/rest-api-intro)
- [Records API](https://docs.fulcrumapp.com/reference/records-intro)
- [Record history](https://docs.fulcrumapp.com/reference/records-get-history)
- [Timestamps](https://docs.fulcrumapp.com/reference/rest-api-timestamps)
- [Importing data](https://help.fulcrumapp.com/en/articles/69897-how-do-i-import-my-data-into-a-fulcrum-app)
- [Downloading or exporting data](https://help.fulcrumapp.com/en/articles/73547-how-to-download-or-export-data)
