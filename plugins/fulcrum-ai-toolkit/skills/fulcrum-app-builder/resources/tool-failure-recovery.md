# Tool Failure And Recovery

Apply this guidance to failed App MCP operations and partially completed
workflows before responding to the user or attempting another write.

> Connector authority: Live installed App MCP schemas define result shapes.
> These disclosure and recovery rules are toolkit safety guidance, not a
> diagnosis of a particular service failure.

## Safe User-Facing Errors

Use only the connector's approved public `code`, `message`, `recovery`, and
`reference` fields. When a safe `trace_id` is supplied, show it as **Trace ID**
for support; otherwise show the safe support reference. Do not invent either
identifier. A trace ID helps support find diagnostics; it does not establish
the cause.

Never copy raw errors, stack traces, exception names, internal API URLs,
request payloads, credentials, or private diagnostics into an end-user reply.
Do not dump the tool result, even when the user asks what failed. A field
named `message` or `error` is not by itself evidence that its contents are
approved for public display.

For legacy, unstructured, missing, or unsafe error guidance, use a generic
message without an invented cause: "Fulcrum could not complete this request.
I will not retry the write automatically." Include only separately safe
trace/reference metadata, if available. Explain which step failed and what
outcome is actually confirmed without leaking the raw response.

## Classify Only What Is Known

Distinguish host approval denial and connector/transport failures from an
actual Fulcrum API response. Do not assign an HTTP status to a failure that
did not supply one.

| Observed status | Safe interpretation | Next action |
| --- | --- | --- |
| 401 | Authentication failed | Check the configured credential source without requesting or displaying the token in chat. |
| 403 | Permission denied | Confirm authorized access; do not broaden permissions or change identity to bypass the failure. |
| 404 | Resource not found or unavailable to this request | Verify the intended resource and organization; do not infer deletion. |
| 409 | Conflict | Inspect current state and follow the approved conflict guidance; do not assume a lock. |
| 429 | Rate limited | Respect supplied wait guidance; this alone does not authorize replaying a write. |
| 422 | Request rejected | Use safe validation/recovery details if supplied; the status alone does not identify the cause. |
| 5xx or unknown | Service failure or unknown outcome | Use public recovery guidance and reconcile state before considering another write. |

Never label a generic 422 as a transient lock. Do not assert a lock,
concurrent edit, validation defect, or specific backend bug without explicit
evidence. Waiting is not a fix for an unexplained rejection.

## Writes And Uncertain Outcomes

Never automatically retry an unchanged write, including a form update.
Stop after a rejection, review the live contract and approved public recovery
guidance, and explain the next step. A corrected write must address an
evidenced problem and stay within the user's approved scope; obtain fresh
approval for changed scope or a deliberate retry.

After a timeout, connection loss, or ambiguous write result, read back the
current state through an authorized read operation before retrying or claiming
that nothing was saved. Compare it with the intended change. If the change is
already present, do not repeat it. For creates, inspect returned identifiers
and the authorized resource listing; do not assume absence from an incomplete
list. If the result cannot be established, report that the outcome is unknown
and stop rather than risk a duplicate.

Read-back is reconciliation, not permission to replay a stale snapshot.
Preserve existing element and choice keys, Record Link configuration, and
unrelated Data Event handlers. Resolve concurrent changes before composing a
new approved update. Do not invent a GET/merge workaround, inject a guessed
`status_field`, regenerate keys, or rebuild a form to bypass a rejected write.

## Form Created, Default Report Template Failed

A returned created form with `report_template_status: "failed"` is partial
success: the form exists, but the default Report Template failed. Use the
approved public details in `report_template_failure` and safe
`report_template_error` text according to the live schema. Older connectors
may return only the form plus `report_template_error`; treat that as the same
partial success, but never echo an unsafe legacy string.

Do not recreate the form. Report the confirmed form name/ID, template failure,
and safe recovery/reference separately. Inspect templates for that form
before an approved `fulcrum_report_templates_create` attempt to avoid a
duplicate after an uncertain result. Only the missing template needs recovery.

## References

- [Fulcrum REST API introduction](https://docs.fulcrumapp.com/reference/rest-api-intro)
- [Fulcrum Forms API](https://docs.fulcrumapp.com/reference/forms-intro)
- [App-building workflow](../SKILL.md)
