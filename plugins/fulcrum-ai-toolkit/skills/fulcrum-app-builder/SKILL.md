---
name: fulcrum-app-builder
description: Guided, novice-friendly workflow for creating or updating a Fulcrum app. Use when a user wants to build an app, add or change fields, or asks whether a Fulcrum app can support a workflow. Explain capabilities and limits, ask focused discovery questions, propose a plain-English schema for approval, then use Fulcrum App MCP as the default control plane when it is available. If App MCP is unavailable, produce a ready-to-implement schema and handoff instead.
---

# Fulcrum App Builder

This skill is the front door for app-building conversations. Use [fulcrum-product-knowledge](../fulcrum-product-knowledge/SKILL.md) for platform boundaries and use the focused skills for goals, discovery, design, safety, data events, extensions, reports, and decomposition. When Fulcrum App MCP is registered, treat its live tool schemas as the control plane for supported app configuration and knowledge operations.

> Source: [App MCP PR #28](https://github.com/fulcrumapp/app-mcp/pull/28) at commit [`43e68bb`](https://github.com/fulcrumapp/app-mcp/commit/43e68bb0a75c9afc6f6ed2b591b66431433737b4) defines the tool contract used by this workflow.

## Step 0: Check Execution Capability

Determine whether the current host has Fulcrum App MCP registered. This toolkit packages guidance only; it does not bundle the server or credentials.

When App MCP is available, inspect its live tool schemas and use it by default for:

| Domain | App MCP capability |
|---|---|
| Forms and embedded Data Event scripts | Form listing, schema listing, reads, creates, updates, deletes, and history |
| Field and form schema knowledge, builders, and validation | Field-type knowledge, new-field and new-form builders, and composed-form validation |
| Choice lists and classification sets | Full configuration lifecycle |
| Projects, global webhooks, and Reference Files | Full configuration lifecycle, with Reference File upload in place of create |
| Layer metadata | Read-only listing and lookup |
| Membership and role metadata | Read-only listing |
| Report Templates and report generation | Template lifecycle plus report generation for a supplied record ID |
| Expression and App Extension knowledge or generation | Expression references plus extension pattern explanation and artifact generation |

App MCP does **not** provide Query API execution, record CRUD, or media CRUD. Do not invent connector calls for those domains. Use another authorized interface or provide a handoff for those operations. Report templates may call the documented `QUERY()` runtime function, but that does not create an App MCP query tool.

If App MCP is unavailable, do not pretend to create or modify a live app. Continue through discovery and schema approval, then provide a handoff that an authorized builder can execute in Fulcrum.

## Step 1: Set Expectations

Briefly explain the supported App MCP surface and any operation that needs another interface. App MCP can configure forms, fields, choices, classifications, projects, global webhooks, Reference Files, Data Event scripts, App Extensions, and reports. It can inspect layer, membership, and role metadata.

Always surface relevant limitations:

- Query API execution, record CRUD, and media CRUD are outside App MCP.
- Workflow automation CRUD is outside App MCP; global webhook CRUD is supported.
- App MCP can manage Report Templates and request report generation, but rendered output still needs visual review.
- External CDN assets do not work for offline extensions.
- Plan gates can prevent Query API, Workflows, advanced data events, SSO, GIS, or AI features.
- Layers, memberships, and roles are metadata-only through App MCP.
- Deleting a form, choice list, Reference File, report template, or field can destroy data or break a workflow and requires explicit confirmation.

## Step 2: Discovery

**Do not skip this step.** Even when the user's initial prompt seems complete, confirming intent before building prevents the most common failure mode: building the wrong thing correctly.

Start by offering a choice:

> "Before I start building, I want to make sure I understand the workflow. Would you like to:
> - **Quick check-in** — I'll confirm your goal, deliverable, and who uses the app (2–3 questions), then we'll build.
> - **Full discovery interview** — 8 structured questions covering the workflow end-to-end. Takes a few more minutes but produces a better app. Recommended if this is a new workflow or you haven't built something like this before."

**If they choose full discovery:** Run the `fulcrum-discovery` skill. After the discovery summary is confirmed, proceed to Step 3.

**If they choose quick check-in** (or don't want to answer): Confirm these three things — do not proceed to schema without them:
- **Goal** — one sentence describing what the app does
- **Deliverable** — what comes out (report, export, notification, dataset)
- **Users** — who completes it in the field and who consumes the output

If the user's prompt already answers some of these clearly, confirm them ("It sounds like this app is for X, producing Y, used by Z — is that right?") and ask only what's missing.

**Discovery Questions** — work into conversation as needed, don't ask all at once:

1. What does the app track or collect?
2. Who completes it and where do they work?
3. What is the desired output: report, dataset, notification, export, or integration?
4. What fields must each record capture?
5. Does the workflow need status stages, calculations, GPS, photos, signatures, audio, video, sketches, attachments, or barcodes?
6. Is the work predefined or discovered ad hoc?
7. Will a choice list be reused by other apps?
8. Is this a new app or an update to an existing app? For an update, identify the form before proposing changes.
9. Does the workflow involve physical hazards or sensitive data?
10. What plan, offline, integration, GIS, or identity constraints apply?

Do not make the user learn Fulcrum field-type terminology. Infer sensible types, but ask when the workflow or data contract is ambiguous.

## Step 3: Propose The Schema

Before any live write, show a plain-English table:

| Field | Type | Notes |
|---|---|---|
| Site name | Short text | Required identifier |
| Condition | Dropdown | Shared or app-specific choices |

Also state:

- The app goal and deliverable.
- The audience and field users.
- Single app versus linked apps.
- Repeatables versus linked child records.
- Shared versus inline choice lists.
- Status stages.
- Calculation logic in plain language.
- Offline behavior and plan dependencies.
- Any fields or changes that could cause data loss.

Get explicit approval before creating or modifying live resources.

## Step 4: Build Or Hand Off

When App MCP is available, follow its live schemas exactly. Do not hand-write new element JSON when a registered schema builder owns that shape.

> Source: [App MCP PR #28](https://github.com/fulcrumapp/app-mcp/pull/28) documents the create/update sequence, mixed choice inputs, default report behavior, and preservation guard.

For a new app:

1. Call `fulcrum_schema_field_types` when field capabilities are uncertain.
2. Build each field with `fulcrum_schema_build_field`.
3. For inline choices, pass either string labels or `{ "label": "...", "value": "..." }` objects. Use object form whenever the stored value differs from the label; App MCP preserves explicit values.
4. Assemble the new form with `fulcrum_schema_build_form`.
5. Validate the generated definition with `fulcrum_forms_validate`.
6. Create it with `fulcrum_forms_create`, including the approved `script` only after the form structure is valid.
7. Let `fulcrum_forms_create` create its default Report Template. Set `skip_default_report: true` only when the user explicitly asks to opt out.

If the result contains a created form plus `report_template_error`, report that the form succeeded and only the default Report Template failed. This error is non-fatal. Do not retry form creation; create the missing template separately with `fulcrum_report_templates_create` when appropriate.

For an existing app:

1. Fetch the current form with `fulcrum_forms_get`.
2. Copy its complete element tree and preserve every existing element key and inline-choice key.
3. Modify requested properties in place without changing their keys.
4. Use `fulcrum_schema_build_field` only for genuinely new field additions, then insert those additions into the copied tree.
5. Preservation is the default. Preserve every unrequested element and choice. Omit `removed_element_keys` when nothing was removed.
6. If the user requests an element removal, explain the data and integration impact and obtain explicit approval. After approval, omit the removed subtree from the copied tree and collect only that subtree root's existing key in `removed_element_keys`; one root key authorizes its descendants. Choice removals also require approval, but choice keys do not belong in `removed_element_keys`.
7. Validate the composed full form with `fulcrum_forms_validate`.
8. Send the complete composed payload and approved removal declarations together:

```javascript
fulcrum_forms_update({
  id: formId,
  elements: composedElements,
  removed_element_keys: removedElementKeys
});
```

Omit `removed_element_keys` when `removedElementKeys` is empty. Never declare a key that is still present in `elements`.

Never rebuild an existing schema wholesale with `fulcrum_schema_build_form`. It generates new keys for new forms, and App MCP rejects updates that replace known element keys.

### Data Event scripts

There are no standalone Data Event CRUD tools. A form has one `script` value:

1. Read the current script with `fulcrum_forms_get`.
2. Compose the approved change with the existing script instead of overwriting unrelated handlers.
3. Write the complete script with `fulcrum_forms_update`.

Use `fulcrum_expressions_data_events_reference` for current hooks and signatures rather than relying on a memorized contract.

If a tool fails, surface the raw error, retry at most once when appropriate, and distinguish connector permission or approval failures from Fulcrum API failures. Never silently retry destructive operations.

When no connector is available, produce the approved schema, field data names, choice values, status stages, calculations, data-event requirements, and implementation notes as a handoff. Do not claim that the app was created.

## Step 5: Handoff Summary

After a build or handoff, summarize:

- Form name and ID, if created or updated.
- Full field list and types.
- Choice lists and values.
- Calculation logic.
- Status workflow.
- Data events, extensions, reports, and integrations.
- Plan and offline dependencies.
- Default Report Template status, including any non-fatal template error.
- Errors, skipped work, unsupported operations, and known limitations.
- Recommended follow-up for PS, CS, or product.

## Explicit Safety Rules

- Never create or update a live resource on inferred intent alone.
- Never delete a form, choice list, or field without explicit confirmation.
- Never use client-side data events as an authorization boundary.
- Never embed secrets in app scripts, report templates, or extension code.
- Never regenerate existing element or choice keys during an update.
- Never claim execution when App MCP is unavailable.

## Scope

This skill orchestrates app creation and updates. Defer deep platform questions to `fulcrum-product-knowledge`, discovery to `fulcrum-discovery`, app structure to `fulcrum-app-design`, safety to `fulcrum-safety`, data events to `fulcrum-data-events`, extensions to `fulcrum-app-extensions`, reporting to `fulcrum-report-building`, and post-build documentation and sharing to `fulcrum-solution-document`.

## References

- [Fulcrum developer documentation](https://docs.fulcrumapp.com/)
- [Fulcrum Forms API](https://docs.fulcrumapp.com/reference/forms-intro)
- [App MCP tool-contract prerequisite](https://github.com/fulcrumapp/app-mcp/pull/28)
- [Agent Skills specification](https://agentskills.io/specification)
- [Toolkit platform reference](../fulcrum-product-knowledge/SKILL.md)
