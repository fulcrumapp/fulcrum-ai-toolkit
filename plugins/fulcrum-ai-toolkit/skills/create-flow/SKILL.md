---
name: create-flow
description: Author or debug Fulcrum Android FLOW data events and graphs, including editor, record, voice, and photo tools. Verify the target build and discover app metadata through an authorized Fulcrum App MCP connection.
metadata:
  version: "2.0.0"
---

## Reasoning-effort preamble

When the host supports configurable reasoning effort, prefer **high** while
running this skill, unless an explicit user setting takes precedence. Use
**medium** for clearly bounded lookups or formatting-only work. Do not assume
**max** or other effort names are supported. This is a recommendation, not a
runtime setting: if the host cannot apply it, keep its configured effort and
follow the same verification steps. Verify unfamiliar Fulcrum terms against
the skill's authoritative sources rather than guessing their meaning.

Write or debug a FLOW data event for the **identified Android build**. FLOW is
not currently supported or verified on iOS; do not present this skill as an iOS
implementation. The toolkit provides guidance, not a FLOW runtime or an MCP
server registration. A separately authorized Fulcrum App MCP connection supports
metadata discovery; installing this skill does not establish that connection.

## Discover apps and fields

When a FLOW needs organization-specific apps or fields, use the authorized
Fulcrum App MCP connection for read-only discovery instead of asking for IDs by
default. Inspect live tool schemas and permissions, confirm the organization
and target app, and resolve ambiguity with the user. Follow the
[app inventory workflow](../fulcrum-app-builder/resources/app-inventory.md)
when finding an app; read the chosen form with `fulcrum_forms_get` when
available. Verify each needed app ID, field key, data name, field type, and
choice against its actual schema. Read only the metadata needed, not records.

Use the identifiers required by each tool and prefer runtime discovery where
supported. A discovered ID does not establish runtime tool availability,
authorization, or cross-app access. If discovery is unavailable, explain the
limitation and request a verified schema or missing identifiers. If sign-in
is required or expired, stop for sign-in; do not bypass it, invent identifiers,
or request credentials in chat. Read-only discovery does not authorize writes.
Before a form-script write, follow
[`fulcrum-data-events`](../fulcrum-data-events/SKILL.md) and
[`fulcrum-app-editing`](../fulcrum-app-editing/SKILL.md), including their
fresh-read, approval, production-safety, and dependency checks.

## Target build and invocation

Confirm the Android build, enabled `flow-data-event` flag, host tool registry,
and any required model artifacts before proposing executable behavior. A merged
PR or current checkout does not prove a deployed build contains a capability.
On the inspected Android development host, `FLOW(options)` serializes options
as JSON and starts asynchronously; a disabled flag silently returns. The
bridge does not pass a JavaScript completion callback, and `FLOW()` does not
return the completed state. Do not rely on either for control flow, show a
callback as working, or use FLOW to block synchronous validation or saving.
If the requirement needs a completion callback, stop and identify the missing
host capability; only use one when independently verified in the target build.

For the inspected host, author a `js` node with a nonempty
`input.expression` string, at most 4096 characters. It is evaluated as an
expression with `form`, `state`, and `tools`; it is not invoked as a function.
Do not use function-valued `input.run`: JSON serialization drops it on this
host. An uncommitted or differently versioned implementation does not change
the installed build. Use `input.run` or a callback only when the exact target
build's serialization, invocation, and completion behavior have been verified;
do not mix `run` and `expression`.

## Scopes and graph

The handler and a FLOW `js` node do not share `form`:

| Scope | Meaning |
| --- | --- |
| Data-event handler | Bare `form` and `recordID` are not defined; use `$$runtime.form` for the schema and `$$runtime.recordID` for the record ID. |
| `js` node | `form` contains field values keyed by data name, not schema. Use `form[data_name]`, `state`, and `tools`. |
| Other function node | Supply tool arguments in `input`; it has no `form` variable. |

When a node needs a verified schema ID or key, capture it in the handler and
embed it as a `JSON.stringify` literal in the expression. Verify target field
identity and type; never overwrite an arbitrary field.

Prefer small nodes, each doing one operation: a direct function node for a
tool call, a decision node for a branch, and a `js` node for a transformation.
Chain with `next`; use `on_error` for failure rather than swallowing errors.
Do not split a transformation into meaningless pass-through nodes.

- Use `schema_version: 1` and 1–50 nodes. The first is entry; every later node
  must be reachable. IDs match `^[a-z][a-z0-9-]{0,63}$`: `read_editor` is
  invalid; use `read-editor`. `end` and `abort` are reserved targets.
- `next`, `on_error`, and decision `default` name a node or reserved target.
  Omitted `next` ends; omitted `on_error` aborts the run. `interaction` is
  not a supported field.
- Assign templates use `{{result.<key>}}`, `{{form.<key>}}`, or
  `{{state.<key>}}`, never `{{result}}`. The suffix is one flat key, not a
  nested path. Extract nested values in a `js` expression. Whole-string
  templates preserve JSON type. Instruction templates use `form` or `state`.
- Omitting `assign` merges a function result's keys into state. Assignments
  store the selected value directly at the destination key. Wrap a tool result
  when needed as `({ value: tools.editor_read({}) })`, assign
  `{{result.value}}`, and read the destination directly. A non-object result
  is stored as `result`, addressable as `{{result.result}}`.
- A decision `when` is `{ ref, op, value }`; `default` is required. Supported
  ops are `eq`, `ne`, `gt`, `gte`, `lt`, `lte`, `in`, `exists`, and
  `not_exists`. `ref: 'state.mode'` addresses the flat key `mode`; `in` takes
  an array and `exists` / `not_exists` take no value.

## Required diagram

Whenever presenting an authored or revised FLOW graph or script, **end the
response** with a Mermaid flowchart, including proposed graphs for approval.
Derive it from the actual graph: include every node ID and kind, entry,
transitions, decision cases and default, error paths, and terminal outcomes.
Show implicit `end` and `abort` where applicable, distinguishing terminal
markers from nodes. Identify manual steps outside FLOW, and do not imply
unimplemented behavior. Label proposals as such.

## Agentic nodes

`instruction` is required, at most 500 characters, and may interpolate
`{{state.<key>}}` or `{{form.<key>}}`. Do not use `assign` on an agentic
node: the parser ignores it. Without an output schema success adds
`state.reply`; otherwise use the output schema's keys. `max_calls` defaults
to 10. Choose a LiteRT-LM model whose artifact is already on disk; the
default `fulcrumite-2b` also requires an installed artifact. The catalog does
not download it or substitute the chat model.

Use `interactive: false` unless `ask_user` is needed and the target build
contains its Android host. Missing, downloading, corrupted, or failed model
artifacts can result in `unknown_model`; provide a reachable `on_error`
path. Unexpected exceptions can become `internal_error` and skip that path.
Voice and photo are not agent tools; call them as function nodes or from a
verified `js` expression, not in an agentic instruction.

## Tools and availability

Check exact wire names, arguments, permissions, the installed build, and the
feature flag. The following are Android host contracts, not promises that
every build contains them:

| Tool | Effect and constraints |
| --- | --- |
| `editor_read` | Reads the open root record; returns `record_id` and `values`. |
| `editor_update` | Changes the open editable root editor, not the saved record; `input.values` uses field keys. |
| `record_search_tool` | Reads by `app_id` and `query`, or one exact field, not both; `sort` and `localDate` are unsupported. |
| `record_create_tool` | Persists a record; values use field keys and the result includes `record_id`. |
| `record_update_tool` | Persists; requires `app_id`, `record_id`, `field_key`, `value`, and `idempotency_key`. |
| `voice_assistant` | Function tool, not an agent tool; requires the voice host. |
| `photo_analyze_tool` | Function tool, not an agent tool; requires the photo host. Pass empty `input`. |

Voice and photo hosts were merged in
[`fulcrum-android#4411`](https://github.com/fulcrumapp/fulcrum-android/pull/4411)
and [`fulcrum-android#4413`](https://github.com/fulcrumapp/fulcrum-android/pull/4413);
`ask_user`'s Android host was merged in
[`fulcrum-android#4433`](https://github.com/fulcrumapp/fulcrum-android/pull/4433).
None of these links proves availability in the user's installed build.

### Voice and photo

`voice_assistant` requires a nonblank `message`. `listen` defaults to true:
listening returns `{ answer, input_mode }` where mode is `voice` or `text`.
With `listen: false`, it returns `{ spoken: true|false }` and does not request
microphone permission. Permission denial, unavailable recognition, or no
recognized speech falls back to typed input; cancellation stops the run and
is not an answer. Do not add a separate speech service or use
`PoleInspectionChatModule`.

`photo_analyze_tool` succeeds with `{ findings, confidence }`; findings are
visible facts, not a fixed checklist. The host keeps the captured file on
success and deletes it on failure or cancellation. Do not attach it to the
record, pass `camera`, download a model on demand, or route through
`PoleInspectionChatModule`.

### Interactive prompts

On a build containing its host, `ask_user` supports `alert`, `confirmation`,
`single_choice`, `multi_choice`, `action_list`, and `text`. `question` must be
nonblank. List kinds require unique nonblank `options`; other kinds must not
have options. Without `kind`, options imply `action_list`, otherwise `text`.
`allow_empty` applies only to text and multi-choice, defaulting to true;
`initial_value` is text only. Results have one of `answer`, `answers`, or
`confirmed`; cancellation stops the run and is not a decline or empty answer.
Use `interactive: true` when an agent must ask and verify model-dependent tool
selection and output on the target build. The shared runtime may also expose
the registered tool to function nodes; do not claim agentic-only access.

## Read-only scaffold

The following uses the inspected Android host's expression wire format. It
only reads the editor, does not select or write a field, and does not expose
finished state to the handler. Confirm the flag, build, and editor tool first.
Preserve the existing script and handlers. A manual observer or a separately
verified host capability is required to inspect the outcome.

```javascript
ON('load-record', function () {
  FLOW({
    schema_version: 1,
    nodes: [
      {
        id: 'read-editor',
        kind: 'function',
        function: 'editor_read',
        input: {},
        on_error: 'failed-read',
      },
      {
        id: 'failed-read',
        kind: 'function',
        function: 'js',
        input: { expression: '({ editor_read_error: true })' },
      },
    ],
  });
});
```

The successful read merges `record_id` and `values` into state. A handled
failure records a marker in FLOW state, not in a handler callback; use an
unhandled error when the host must report failure. The `load-record` trigger
can run repeatedly. Before delivery or a write, follow
[`fulcrum-performance-review`](../fulcrum-performance-review/SKILL.md):
assess representative form size, repeated launches, serialization, tool I/O,
and downstream calculations, distinguishing static risks from measurements.
Do not claim device performance or full dependency review without evidence.

## Checklist

- Confirm target platform, build, flag, host capabilities, model, organization,
  form, and required fields; disclose unresolved or unsupported prerequisites.
- Use the correct handler and node scopes, reachable nodes, valid IDs, flat
  assign templates, explicit failure paths, and small operations.
- On the inspected host use `input.expression`; do not rely on `input.run`, a
  completion callback, or a return value. Never block synchronous save or
  validation on FLOW.
- Distinguish persisted record writes from editor-only changes. Check voice,
  photo, and `ask_user` host availability; never turn cancellation into an
  answer or a photo into a record attachment.
- Review the existing script, dependencies, permissions, lifecycle, side
  effects, and performance; obtain required approvals before a live write.
  Do not commit local debug scripts unless requested. A device database patch
  is not the cloud script and sync can restore the server version.
- End every graph or script response with its matching Mermaid flowchart.

## References

- [Android FLOW hook, inspected development revision](https://github.com/fulcrumapp/fulcrum-android/blob/e12894dff35d66e0e22f9b8a0e2d877ed0460df8/app/src/main/java/com/spatialnetworks/fulcrum/app/flow/FlowDataEventHooks.kt)
- [Android JavaScript evaluator, inspected development revision](https://github.com/fulcrumapp/fulcrum-android/blob/e12894dff35d66e0e22f9b8a0e2d877ed0460df8/app/src/main/java/com/spatialnetworks/fulcrum/app/flow/J2V8FlowJavaScriptRuntime.kt)
- [Android device graph examples, inspected development revision](https://github.com/fulcrumapp/fulcrum-android/blob/e12894dff35d66e0e22f9b8a0e2d877ed0460df8/app/src/androidTest/java/com/spatialnetworks/fulcrum/app/flow/FlowDataEventExecutorDeviceTest.kt)
