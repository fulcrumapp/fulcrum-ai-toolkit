---
name: fulcrum-integration-patterns
description: Select and design Fulcrum Workflows and integrations. Use for webhooks, global webhooks, URL Actions, REST integrations, middleware, authentication, retries, timeouts, payload safety, and delivery boundaries.
---

# Fulcrum Integration Patterns

Choose a supported integration shape, define its delivery contract, and hand
off only actions exposed by the current authorized interface.

## When To Use

Use this skill for:

- deciding among Workflows, global webhooks, URL Actions, REST API calls,
  polling, and middleware;
- designing endpoint authentication, idempotency, retries, timeout handling,
  payload minimization, and reconciliation;
- checking whether repeatables, media, imports, bulk actions, or offline users
  affect the event contract; and
- inspecting or managing global webhooks through App MCP.

## When Not To Use

- Use [`fulcrum-data-events`](../fulcrum-data-events/SKILL.md) for in-record
  client logic.
- Use [`fulcrum-query-api`](../fulcrum-query-api/SKILL.md) for read-only SQL
  modeling.
- Use [`fulcrum-app-extensions`](../fulcrum-app-extensions/SKILL.md) for custom
  in-record UI.
- Do not use this skill as a private middleware runbook or as authority for a
  third-party product's current behavior.

## Source Order

1. Live installed App MCP schemas for connector operations and arguments.
2. Public Fulcrum docs/OpenAPI for Workflows, webhooks, URL Actions, and REST
   behavior.
3. Fulcrum pricing for plan or add-on availability.
4. The external system's current public contract for its side of the
   integration.

> Source: [Workflows API](https://docs.fulcrumapp.com/reference/workflows-api),
> [Webhooks](https://docs.fulcrumapp.com/docs/webhooks),
> [URL Actions](https://docs.fulcrumapp.com/docs/url-actions), and the
> [REST API introduction](https://docs.fulcrumapp.com/reference/rest-api-intro).

## Workflow

1. **Frame the event.** Identify producer, trigger, scope, ordering needs,
   latency, volume, online/offline constraints, and acceptable data loss.
2. **Inspect current contracts.** Confirm plan/role access, event coverage,
   payload shape, bulk/import behavior, endpoint requirements, and external API
   limits from current sources.
3. **Select the pattern.** Use
   [`integration-selection-reference.md`](resources/integration-selection-reference.md)
   to choose the narrowest supported mechanism.
4. **Design delivery.** Define authentication, secret storage, least-data
   payloads, timeout budget, queueing, idempotency key, retry ownership,
   duplicate handling, dead-letter/reconciliation path, observability, and
   recovery.
5. **Review safety.** Use synthetic payloads during design. Confirm where
   personal, location, media, and repeatable data may leave Fulcrum.
6. **Authorize and hand off.** Present the chosen contract and obtain explicit
   confirmation before activation, replacement, or deletion.
7. **Verify behavior.** Test success, duplicate, timeout, malformed payload,
   authentication failure, and recovery paths without exposing production data.

## App MCP Handoff

When the live schema matches the settled connector contract, use
`fulcrum_webhooks_list` and `fulcrum_webhooks_get` to inspect global webhooks,
and `fulcrum_webhooks_create`, `fulcrum_webhooks_update`, or
`fulcrum_webhooks_delete` for approved changes. Re-read the live schema first.
Deletion requires explicit confirmation.

App MCP has no Workflow CRUD tools. A global webhook operation is not a
Workflow operation, and its contract must not be presented as one.

> Connector authority: Live installed App MCP schemas take precedence over
> toolkit prose.

## Confirmation, Privacy, And Failure

Never embed credentials in URLs, client scripts, examples, or webhook payloads.
Do not send tenant data to public request inspectors. Treat activation, endpoint
replacement, disabling delivery, and deletion as consequential changes.

If a source, plan, role, payload, or connector contract is unresolved, stop at
an implementation-ready design and name the missing evidence. Surface API and
delivery failures; do not silently retry mutations or report that an
integration is active without end-to-end evidence.

## References

- [Workflows API](https://docs.fulcrumapp.com/reference/workflows-api)
- [Webhooks](https://docs.fulcrumapp.com/docs/webhooks)
- [Webhooks API](https://docs.fulcrumapp.com/reference/webhooks-intro)
- [URL Actions](https://docs.fulcrumapp.com/docs/url-actions)
- [REST API introduction](https://docs.fulcrumapp.com/reference/rest-api-intro)
- [Fulcrum pricing](https://www.fulcrumapp.com/pricing/)
