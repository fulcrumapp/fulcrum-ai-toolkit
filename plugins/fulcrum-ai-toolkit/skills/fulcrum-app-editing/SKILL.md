---
name: fulcrum-app-editing
description: Safely modify an existing Fulcrum app. Use before any update to an existing form, especially for production apps, schema restructuring, field removal, or field type changes. It detects records through Query MCP, analyzes data impact, and uses an approval-gated same-organization clone, diff, and promotion workflow.
---

# Fulcrum App Editing

Use this skill for every edit to an existing Fulcrum form. It is the
production-safety gate for [`fulcrum-app-builder`](../fulcrum-app-builder/SKILL.md):
preserve that skill's design, validation, key-preservation, performance, and
freshness requirements.

Treat live installed Fulcrum MCP gateway schemas as authoritative for available
tool names, arguments, result shapes, and permissions. Use App MCP for
configuration and Query MCP only for read-only record detection and impact
analysis. Never use raw API calls or unregistered tools. If a required MCP
operation is unavailable, stop and provide a handoff.

> Source: [Fulcrum Forms API](https://docs.fulcrumapp.com/reference/forms-intro)
> and [Query API introduction](https://docs.fulcrumapp.com/reference/query-intro).

## Entry Gate

Before proposing an edit, identify the target form with App MCP and read its
complete current definition. Ask the user:

> "Is this a production app with active field users, or a development/sandbox
> app? Does it have a separate sandbox form in the same organization?"

Do not infer production status from the app name, organization, or record
count. App MCP metadata does not establish whether field users are active.
Record the user's answer and treat either a production designation or a
positive record count as production-sensitive.

Inspect the live gateway schemas before every operation. If App MCP cannot read
the target form or cannot update forms, stop and provide a handoff; do not
claim a live edit.

## Required Record Detection

Before any `fulcrum_forms_update` for an existing form:

1. Complete the read-only discovery workflow in
   [`fulcrum-query-api`](../fulcrum-query-api/SKILL.md): use `form_summaries`
   to identify the authenticated form, then `get_form_query_tables(form_id)` to
   discover the current app table and its record identifier.
2. From those discovered identifiers, submit one read-only, single-line
   aggregate query through `query_records`. Count records only after metadata
   confirms the selected app table has one row per record; otherwise use the
   discovered record identifier in a `COUNT(DISTINCT record_identifier)`
   aggregate. Retrieve no record values.
3. Surface the exact count, source form identity, query limitation, and the
   user's production/sandbox classification before proposing the change.
4. Immediately after the final fresh form read and before the approved
   `fulcrum_forms_update`, rerun the count-only aggregate. If the count,
   form identity, or classification differs from the approved baseline, stop,
   reconcile the change, update the impact analysis, and obtain approval again.

Query MCP must be advertised and authorized for this gate. If metadata, a safe
count query, or its result is unavailable or incomplete, record presence is
unknown: do not issue `fulcrum_forms_update`. Explain that production safety
cannot be verified and provide the smallest authorized discovery or handoff
step. Do not substitute a raw API call, an inferred table name, or an empty
result.

## Classify The Edit

Use the following routing after the required count is known:

| Condition | Required route |
| --- | --- |
| User confirms sandbox/development and the count is zero | Follow the guarded direct-update workflow in `fulcrum-app-builder`, including design approval, validation, key preservation, and pre-write freshness. |
| User identifies production, or the count is positive | Follow the production safety flow below. A positive count is production-sensitive even when the user calls the app a sandbox. |
| Production status is unknown | Treat it as production-sensitive. Do not bypass the production flow. |

The zero-record route is not authorization to destroy a field, change its
concrete type, or overwrite concurrent edits. It retains every explicit
confirmation and freshness gate from the builder.

## Analyze Data And Dependency Impact

Before approval, determine whether the requested change removes a field,
removes a subtree, changes a field's concrete type, changes repeatable/link
structure, or changes a field's data semantics. These are potentially
destructive migrations.

For every affected field:

1. Read the current form and use its existing key and data name only as a
   candidate mapping.
2. Use the tables and columns returned by `get_form_query_tables(form_id)` to
   verify the app-table or repeatable-table column. Never derive a SQL
   identifier from the field label or guess a column name.
3. Run a read-only, single-line aggregate query that reports populated records
   out of the total record count. For repeatables, use the discovered parent
   record identifier so the result counts distinct parent records rather than
   child rows. Retrieve counts, not field values.
4. State the impact plainly before approval, for example: "Field `site_code`
   has data in 137 of 412 records. Removing it will make that data
   inaccessible." Include limitations such as unsupported field storage or a
   nullable/encoded representation.
5. Inspect the current form and supported metadata for dependencies, including
   record links, choice lists, classification sets, global webhooks, Report
   Templates, Data Event scripts, Reference Files, and App Extensions.
   Classify every dependency as **preserved**, **recreated**, **excluded**, or
   **unresolved**, with evidence from the current form or a supported MCP
   result. Do not infer a clone or promotion outcome from the dependency type.

If a field-to-column mapping, parent cardinality, populated-record count, or
dependency inspection cannot be established, stop the destructive or
restructuring edit. Do not present an unknown impact as zero impact.

An unresolved dependency that can affect data capture, integrations, or runtime
behavior blocks promotion until it is resolved. For other exclusions or
unresolved dependencies, show the user the specific limitation and obtain
explicit approval before promotion.

## Code Performance Evaluation

Whenever authoring, modifying, or reviewing a Data Event script or other code
as part of an app edit, complete
[`fulcrum-performance-review`](../fulcrum-performance-review/SKILL.md) before
delivery or persistence. Review the final composed code, trigger frequency,
repeated lookups or requests, calculation chains, and synchronous
validation/save work; do not treat a clone as authorization to skip this
review.

## Production Safety Flow

For a production-sensitive edit, use this approval-gated same-organization
workflow:

1. **Capture the baseline.** Read the complete production form, record count,
   target identity, current revision/content fingerprint when available,
   requested change, impact counts, dependency classifications, and user
   classification.
2. **Validate and approve the clone plan.** Complete the builder's validation
   for the proposed clone and change. When the proposal authors or changes a
   Data Event script or other code, complete
   [`fulcrum-performance-review`](../fulcrum-performance-review/SKILL.md)
   before any sandbox or production write. Show the intended clone, requested
   change, impact counts, dependency limitations, and operation, then obtain
   explicit approval to create the sandbox clone. Do not create a sandbox
   clone before this approval.
3. **Create a sandbox clone.** Use only a currently advertised App MCP
   create/build workflow to create a separate form in the same organization.
   Build new clone elements with supported schema builders; do not reuse
   production element or choice keys. Preserve field data names only when the
   live schema and the user's sandbox purpose support it. Do not claim that
   record links, shared choice lists, classifications, webhooks, reports,
   scripts, Reference Files, or extensions were cloned unless the live MCP
   result verifies each one.
4. **Make the proposed change on the clone.** Apply the normal builder
   validation and repeat the performance review before any clone write when
   the final composition contains code. The clone is a rehearsal environment,
   not authorization to skip removal approval or impact reporting.
5. **Show a human-readable diff.** Compare the fresh production baseline with
   the reviewed clone intent. Identify additions, removals, moved/restructured
   elements, type/setting/choice/script changes, field keys/data names, impact
   counts, and every dependency classification. Explicitly show excluded and
   unresolved resources. Do not present raw JSON alone as the review artifact.
6. **Obtain explicit promotion approval.** State the production form identity,
   exact approved changes, record and impact counts, known limitations, and
   the final operation. Approval of the clone does not authorize production.
   Do not request promotion approval while a data-capture, integration, or
   runtime-affecting dependency remains unresolved.
7. **Reconcile and promote.** Follow the builder's
   [pre-write freshness safeguard](../fulcrum-app-builder/resources/pre-write-freshness.md):
   re-read production and dependencies, reconcile only approved changes into
   the fresh production schema, preserve every existing element and choice key,
   revalidate the composed form, rerun required impact/count checks, and
   reapprove material differences. Only then call `fulcrum_forms_update`.
8. **Report the result.** State the production form identity, applied changes,
   final record count, final dependency classifications, errors, and any
   partial state.
   A failed update after a successful clone is not a promotion; do not replay
   stale payloads or silently roll back another editor's work.

Cross-organization promotion is outside this skill's automated flow. When the
user needs it, provide a handoff that inventories source/target differences,
mapping, authorization, dry run, reconciliation, cutover, and rollback through
[`fulcrum-data-migration`](../fulcrum-data-migration/SKILL.md). Do not assume
identities, dependencies, or permissions transfer between organizations.

## Non-Negotiable Rules

- Never call `fulcrum_forms_update` on an existing form without the required
  record count and a final count recheck.
- Never remove or restructure a field without surfacing its populated-record
  impact and obtaining explicit approval.
- Never regenerate or replace existing production element or choice keys.
- Never treat a clone as a complete copy of dependent resources without
  verified live MCP results.
- Never promote while a dependency affecting data capture, integrations, or
  runtime behavior is unresolved. Never silently exclude another dependency;
  surface it and obtain explicit approval.
- Never use raw API calls or unregistered tools. If a required MCP operation is
  unavailable, stop and provide a handoff.
- Never claim that a query, clone, diff, approval, or promotion occurred when
  the supported operation was unavailable or failed.

## References

- [Fulcrum Forms API](https://docs.fulcrumapp.com/reference/forms-intro)
- [Query API introduction](https://docs.fulcrumapp.com/reference/query-intro)
- [Pre-write freshness and artifact consistency](../fulcrum-app-builder/resources/pre-write-freshness.md)
- [Fulcrum Query API skill](../fulcrum-query-api/SKILL.md)
