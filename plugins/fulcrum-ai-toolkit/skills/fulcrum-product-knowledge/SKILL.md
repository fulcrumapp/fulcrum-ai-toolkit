---
name: fulcrum-product-knowledge
description: Route cross-cutting Fulcrum platform questions to the owning skill or registered App MCP knowledge tool. Use for capability boundaries, plans, offline behavior, integrations, GIS, Query API, identity, and limitations that span focused workflows.
---

# Fulcrum Platform Knowledge Reference

Use this skill as the platform router behind the more focused Fulcrum skills. Prefer the narrower skill when it owns the workflow, and use this skill for platform facts, constraints, capability decisions, and cross-cutting architecture. When Fulcrum App MCP is registered, defer schema, expression, extension, and tool-contract questions to its live knowledge and operation schemas instead of duplicating those contracts here.

> Source: [App MCP PR #28](https://github.com/fulcrumapp/app-mcp/pull/28) at commit [`43e68bb`](https://github.com/fulcrumapp/app-mcp/commit/43e68bb0a75c9afc6f6ed2b591b66431433737b4) is the prerequisite contract snapshot for this toolkit orientation.

## Platform Boundaries

Fulcrum is a no-code/low-code field operations platform with a web app builder, mobile data collection, offline maps and records, data events, reports, APIs, webhooks, integrations, and app extensions.

Fulcrum is not:

- A pre-built industry solution. Each implementation requires configuration.
- A BI platform. Advanced analytics usually require Power BI, Tableau, or another external tool.
- A drag-and-drop automation platform for complex logic. Use data events, Workflows, or integrations according to the requirements.
- A full GIS replacement with native symbology, lasso selection, or native mobile editing of private ArcGIS layers.
- A service that automatically maintains customer apps after handoff unless an explicit managed-service arrangement exists.

Resolve these boundaries before designing an app or promising an integration.

## Plans And Licensing

Confirm the organization's plan before scoping work. Professional, Elite, and Enterprise plans do not expose the same capabilities. In particular, verify access to:

| Capability | What to confirm |
|---|---|
| REST API and Developer Pack | Required for many API and integration workflows |
| Query API | Required for SQL-based access and many multi-record reports |
| Webhooks and Workflows | Plan availability and whether the required payload/auth behavior is supported |
| Advanced data events | `LOADRECORDS()` and `LOADFILE()` may require Elite or Developer Pack |
| SSO, SCIM, and audit logging | Enterprise administration and compliance requirements |
| ArcGIS Enterprise connectivity | Private feature service requirements |
| AI features | Audio FastFill, Insights, face blurring, and custom inference may be plan-gated |

Plan gates are part of the design, not an implementation detail. If a required capability is unavailable, explain the limitation and propose a fallback or upgrade conversation.

## App Designer And Field Types

Choose the most constrained field type that captures the data:

- Basic: text, numeric, yes/no, date, time.
- Choice: single choice, multiple choice, and Classification Set.
- Media: photo, video, audio, signature, sketch, and attachment.
- Structure: section, label, repeatable, and record link.
- Advanced: address, hyperlink, barcode, and calculation.

Field options commonly include label, data name, description, default value, required, hidden, read-only, and default-to-previous-value. Do not make every field required; over-requiring causes crews to enter low-quality placeholder data.

A Classification Set captures one path through a hierarchy. To capture multiple classifications, put one Classification Set inside a repeatable.

Choice labels are display-only. Choice values are stored, exported, and sent to integrations. Set and review values explicitly rather than treating labels as the data contract.

## App Architecture

Use a single app when one person completes a simple workflow at one location and the record has a straightforward lifecycle. Use linked apps when roles, lifecycles, visits, or record counts differ.

Use a repeatable for a finite, bounded set of child items that belongs to the parent and does not need independent management. Use a linked child app when items have their own lifecycle, need independent queries, or can grow indefinitely. A date field inside a repeatable is a useful signal that the list may be unbounded, but confirm the workflow rather than applying it mechanically.

Resolve predefined versus ad hoc work:

- Predefined work: import known assets or assignments so crews can open the correct record without searching.
- Ad hoc work: use a Record Link or other lookup pattern to connect records discovered in the field.

Practical design limits include roughly 80 fields as a usability ceiling, about 100 photos per record, about 100 repeatable items per parent, and about 100 record-link results before mobile usability degrades. Avoid deeply nested repeatables.

## Data Events

Data events run on-device and in the web app. Design offline-first:

- `REQUEST()` needs connectivity and browser CORS support on web.
- `LOADRECORDS()` reads locally synced records and can work offline.
- `LOADFILE({ name, form_name/form_id, variable }, callback)` loads a Reference File by name and may target another form.
- Data events do not support `async/await`; use the platform's supported callback patterns.
- Long-running work during save can block the user; use the documented prevent/resume pattern when necessary.
- Repeatable fields may need manual data-name references in the builder.

Common functions include `ON`, `SETVALUE`, `SETREQUIRED`, `SETHIDDEN`, `SETREADONLY`, `SETSTATUS`, `SETLABEL`, `SETCHOICES`, `VALUE`, `CHOICEVALUES`, `ROLE`, `EMAIL`, `LATITUDE`, `LONGITUDE`, `RECORDID`, `REQUEST`, `LOADRECORDS`, `LOADFILE`, `STORAGE`, `ALERT`, `CONFIRM`, and `INVALID`.

Do not use data events as a security boundary. Use platform permissions for authorization, avoid secrets in scripts, pin external dependencies, and document fallback behavior for offline use.

When App MCP is available, call `fulcrum_expressions_data_events_reference` for current signatures. Data Event code is the form's `script`; read and write it through `fulcrum_forms_get` and `fulcrum_forms_update`, not imagined standalone Data Event CRUD tools.

> Source: [Fulcrum `LOADFILE()` reference](https://docs.fulcrumapp.com/docs/data-events-loadfile) and [App MCP PR #28](https://github.com/fulcrumapp/app-mcp/pull/28).

## Workflows And Webhooks

Workflows are configured in the web interface and are useful for record-triggered Email, Webhook, SMS, and assignment actions. Confirm plan availability and whether the trigger includes imports.

Workflow webhooks can support Mustache payload customization and auth headers, while global webhooks generally use a standard payload and do not support custom auth headers. URLs are static. Repeatable data is not normally included in webhook payloads; serialize it into a field or fetch the record server-side.

Webhook endpoints should return HTTP 200 within 20 seconds. Queue long-running work and return promptly. Use middleware such as n8n, Power Automate, Zapier, a serverless function, or a controlled service for mapping, retries, authentication, and external API calls.

Choose among data events, Workflows, global webhooks, polling, URL Actions, and a database-app/Record Link pattern based on online requirements, payload needs, authentication, and whether data must be available offline.

## Reporting

Standard reports provide generic PDF output with limited configuration. Advanced reports use server-side EJS and can produce PDF or HTML. Use `QUERY()` for data beyond the single record context, `PHOTOURL()` and `SIGNATUREURL()` for media, and documented `API(path, options)` calls for Fulcrum REST resources.

Treat Report Templates as code: test them outside the builder, sanitize parameters before SQL interpolation, never hardcode tokens, and keep a local copy.

With App MCP, manage templates through its registered Report Template list, get, create, update, and delete tools, and generate a report for a supplied record ID with `fulcrum_reports_create`. App MCP does not provide general record, Query API, or media CRUD.

> Source: [Fulcrum Report Builder functions](https://docs.fulcrumapp.com/docs/functions) and [App MCP PR #28](https://github.com/fulcrumapp/app-mcp/pull/28).

## App Extensions

Use an extension when native fields cannot provide the required UI. Use data events for logic that does not need a custom interface. Reference Files and inline assets can support offline extensions; CDN assets make the workflow online-only. Pin CDN versions.

For picker extensions, store the result in a TextField and use a HyperlinkField as the trigger. Do not combine a picker extension with a ChoiceField's native picker.

When App MCP is available, use `fulcrum_extensions_list_patterns`, `fulcrum_extensions_explain`, and `fulcrum_extensions_generate`. Keep the generated inline bootstrap and the `OPENEXTENSION({ url, title, data, onMessage })` / `payload.data` contract rather than reproducing an older bridge from memory.

> Source: [Fulcrum App Extensions introduction](https://docs.fulcrumapp.com/docs/app-extensions-introduction) and [App MCP PR #28](https://github.com/fulcrumapp/app-mcp/pull/28).

## Query API

The Query API provides read-only SQL access to Fulcrum data. Quote app names containing spaces or special characters. Repeatables are separate tables joined through `fulcrum_parent_id`; nested repeatables also expose the root record ID.

Common system tables include `forms`, `memberships`, `photos`, `videos`, `audio`, `signatures`, `sketches`, `choice_lists`, `classification_sets`, `projects`, `roles`, `changesets`, `devices`, `record_links`, and membership relationship tables.

Common app metadata includes `_record_id`, `_status`, `_created_at`, `_updated_at`, `_created_by`, `_updated_by`, `_assigned_to`, `_project_id`, `_geometry`, `_latitude`, and `_longitude`. PostGIS spatial functions can support distance, intersection, containment, area, and length queries where available.

## GIS And Mapping

Fulcrum supports app data, MBTiles, ArcGIS feature services, KML, XYZ tiles, WMS, and GeoJSON with platform-specific web/mobile/offline limits. MBTiles and synced app data are the dependable offline options. Private ArcGIS feature service layers are not generally available offline, and native two-way Esri synchronization requires a custom integration.

## Users, Roles, And Enterprise

Separate role-based permissions from resource permissions for apps, projects, and layers. Consider custom roles and groups for larger organizations. SSO and SCIM require plan and identity-provider validation; migration requires coordination because IDs, tokens, history, timestamps, and user associations may change.

## AI And Sidecar Capabilities

AI features may be plan-gated and may require connectivity. Confirm offline behavior for Audio FastFill and Insights, while evaluating local capabilities such as face blurring or custom inference separately.

Use a sidecar application when the workflow needs administration, analysis, synchronization, or a lifecycle that does not belong inside a mobile data-collection record.

## MCP Build Reference

This section applies only when Fulcrum App MCP is registered in the current host. This repository provides portable skills, not the server or credentials.

App MCP is the default control plane for supported app configuration:

- Form CRUD/history/schema listing and embedded Data Event `script`
- Schema field/form builders and form validation
- Choice List, Classification Set, Project, and global Webhook CRUD
- Reference File management
- Layer metadata plus Membership and Role metadata
- Report Template CRUD and report generation
- Schema, expression, Data Event, and App Extension knowledge or generation

Query API execution, record CRUD, and media CRUD remain outside App MCP. Do not infer tool names for unsupported domains.

For a new form:

1. Inspect field types with `fulcrum_schema_field_types` when needed.
2. Build fields with `fulcrum_schema_build_field`. Choice input accepts strings and `{label, value}` objects; explicit values are preserved.
3. Assemble the form with `fulcrum_schema_build_form`.
4. Validate with `fulcrum_forms_validate`.
5. Create with `fulcrum_forms_create`. Keep the default Report Template unless `skip_default_report` is explicitly requested.

For an existing-form element change:

1. Fetch the current form with `fulcrum_forms_get`.
2. Treat preservation as the default: copy the complete element tree and preserve every existing element and inline-choice key.
3. Build only new field additions with `fulcrum_schema_build_field` and insert them into the copied element tree.
4. For an element removal, explain the impact and obtain explicit user confirmation. Omit the approved subtree from the copy and pass only its existing root key in `removed_element_keys`; the root declaration covers its descendants.
5. Validate the composed full definition with `fulcrum_forms_validate`.
6. Call `fulcrum_forms_update` with the complete assembled `elements` array and any approved `removed_element_keys`. Omit `removed_element_keys` when no elements were removed.

Never rebuild an existing schema wholesale with `fulcrum_schema_build_form`; doing so regenerates keys. Never declare a removed key that remains in `elements`. Surface approval and API errors rather than silently retrying.

If form creation succeeds but returns `report_template_error`, report a successful form and a non-fatal default-template failure. Do not retry form creation.

> Source: [App MCP PR #28](https://github.com/fulcrumapp/app-mcp/pull/28) documents the registered tools and key-preservation guard. [Fulcrum Forms API](https://docs.fulcrumapp.com/reference/forms-intro) documents the form `script` field.

## Decision Checklist

- [ ] Plan and licensing gates are confirmed.
- [ ] The workflow fits Fulcrum's platform boundaries.
- [ ] App structure, field types, and repeatable/link decisions are explicit.
- [ ] Offline behavior and external dependencies are documented.
- [ ] Integrations have an endpoint, authentication, timeout, retry, and middleware plan.
- [ ] Reports use safe query and media patterns.
- [ ] Permissions are handled by platform controls, not client-side scripts.
- [ ] MCP actions are attempted only when the connector is available.
- [ ] Destructive changes have explicit confirmation.

## References

- [Fulcrum developer documentation](https://docs.fulcrumapp.com/)
- [Fulcrum data events reference](https://docs.fulcrumapp.com/docs/data-events-reference)
- [Fulcrum `LOADFILE()` reference](https://docs.fulcrumapp.com/docs/data-events-loadfile)
- [Fulcrum Query API introduction](https://docs.fulcrumapp.com/reference/query-intro)
- [Fulcrum reports introduction](https://docs.fulcrumapp.com/docs/reports-introduction)
- [Fulcrum app extensions introduction](https://docs.fulcrumapp.com/docs/app-extensions-introduction)
- [App MCP tool-contract prerequisite](https://github.com/fulcrumapp/app-mcp/pull/28)
- [Agent Skills specification](https://agentskills.io/specification)
