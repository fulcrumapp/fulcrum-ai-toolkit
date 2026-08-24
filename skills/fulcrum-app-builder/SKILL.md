---
name: fulcrum-app-builder
description: Guided, novice-friendly workflow for creating or updating a Fulcrum app. Use when a user wants to build an app, add or change fields, or asks whether a Fulcrum app can support a workflow. Explain capabilities and limits, ask focused discovery questions, propose a plain-English schema for approval, then build only through an available Fulcrum MCP connector. If no connector is available, produce a ready-to-implement schema and handoff instead.
---

# Fulcrum App Builder

This skill is the front door for app-building conversations. Use [fulcrum-product-knowledge](../fulcrum-product-knowledge/SKILL.md) as the platform source of truth and use the focused skills for goals, discovery, design, safety, data events, extensions, reports, and decomposition.

## Step 0: Check Execution Capability

Determine whether the current host has a Fulcrum MCP connector with app-building tools. This repository does not provide that connector.

If the connector is available, use its documented schema-builder and form tools. If it is not available, do not pretend to create or modify a live app. Continue through discovery and schema approval, then provide a handoff that an authorized builder can execute in Fulcrum.

## Step 1: Set Expectations

Briefly explain what the available connector can and cannot do. Depending on the connector, app building may cover text, choices, dates, numbers, photos, GPS, signatures, barcodes, calculations, sections, repeatables, shared choice lists, status workflows, data events, webhooks, and extensions.

Always surface relevant limitations:

- Custom report layouts may require manual work in the Fulcrum web app.
- Workflow configuration and some integration features may be UI-only.
- External CDN assets do not work for offline extensions.
- Plan gates can prevent Query API, Workflows, advanced data events, SSO, GIS, or AI features.
- Deleting a form, choice list, or field can destroy data and requires explicit confirmation.

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

When the Fulcrum MCP connector is available, follow its exact documented sequence. Prefer schema builders over hand-written element JSON:

For a new app:

1. Build each field with the connector's field schema tool.
2. Assemble the elements with the form schema tool.
3. Create the form using the generated elements.
4. Add scripts or other resources only after the form structure is valid.

For an existing app:

1. Retrieve the current form schema.
2. Modify only the requested parts.
3. Preserve existing elements unless removal was explicitly approved.
4. Warn again before removing a field because stored data may be deleted.
5. Update the complete required schema.

If a tool fails, surface the raw error, retry at most once when appropriate, and distinguish connector permission or approval failures from Fulcrum API failures. Never silently retry destructive operations.

When no connector is available, produce the approved schema, field data names, choice values, status stages, calculations, data-event requirements, and implementation notes as a handoff. Do not claim that the app was created.

## Step 5: Handoff Summary

After a build or handoff, summarize:

- Form name and ID, if created.
- Full field list and types.
- Choice lists and values.
- Calculation logic.
- Status workflow.
- Data events, extensions, reports, and integrations.
- Plan and offline dependencies.
- Errors, skipped work, and known limitations.
- Recommended follow-up for PS, CS, or product.

## Explicit Safety Rules

- Never create or update a live resource on inferred intent alone.
- Never delete a form, choice list, or field without explicit confirmation.
- Never use client-side data events as an authorization boundary.
- Never embed secrets in app scripts, report templates, or extension code.
- Never claim execution when the MCP connector is unavailable.

## Scope

This skill orchestrates app creation and updates. Defer deep platform questions to `fulcrum-product-knowledge`, discovery to `fulcrum-discovery`, app structure to `fulcrum-app-design`, safety to `fulcrum-safety`, data events to `fulcrum-data-events`, extensions to `fulcrum-app-extensions`, reporting to `fulcrum-report-building`, and post-build documentation and sharing to `fulcrum-solution-document`.
