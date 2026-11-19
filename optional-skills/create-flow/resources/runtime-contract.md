# FLOW runtime contract

## Evidence boundary

Reference baseline: Fulcrum Android commit
`270f21660edb45f57d43eec203cedbe0bf02f0c2`, inspected November 17, 2026.
The source links below may require repository access. This is a source snapshot,
not an installed-build guarantee or an exhaustive API catalog. Consult verified
shared parser/tool metadata and this reference before generating runnable code.
If the skill does not cover a required contract or the target may differ, obtain
updated skill guidance or independently verified runtime documentation. Do not
inspect application source during FLOW authoring or invent support.

## Missing-context handoff

When a required capability is not documented for the target build, capture the
capability and intended outcome, target build, known evidence, and unanswered
questions about registration, inputs, outputs, side effects, and lifecycle.
Mark it **unverified** and request a verified contract or updated skill context.
Keep tenant-specific identifiers and records out of the distributable skill.
Do not infer runtime support from a shared catalog or an authoring-time tool.

## User-supplied target contracts

Recorded November 18, 2026 from the user running the FLOW-tools target.
Prefer this guidance over the November 17 snapshot only where a later
authorized source inspection does not contradict it. The new-record
recollection is contradicted below. Keep tenant identifiers out of this skill.

### Search, then choose

`record_search_tool` can return a list of matches. Use it when searching
locally available records meets the agreed requirement. Present matches with
`ask_user` kind `single_choice`; the prompt shows the options in a scroll.
Build `options` in an earlier node from the returned records. Each option
must be a unique nonblank label. Map the selected label back to the record
ID using fields on the returned records. Do not store the label as the link.

Read the list the tool actually returns. Do not invent a result-key name.
An empty or failed search is not a successful selection. Do not assume an
empty query lists every record.

`query-mcp_query_records` is an authoring-time Query API tool. It is not a
FLOW function and must not be placed in a FLOW graph. There is no FLOW tool
named "search precursor."

### Device-verified search result

Verified November 18, 2026 on an authorized Samsung S25 running Fulcrum Debug.
A FLOW function node called `record_search_tool` with an `app_id` and a short
text `query`, and no `assign`. The next node saw these top-level state keys:

- `has_more`: `false` for that one-match search
- `match_count`: `1`
- `records`: an array of length 1

The first record object had keys `record_id`, `app_id`, `title`, and `values`.
This one run does not prove pagination or that every tool merges its result
into state. Keep using `{{result...}}` when an explicit `assign` is needed.

Authorized source inspection of this worktree, agent-android 1.0.111, explains
that result. `FlowRecordSearchAdapter` copies each hit into `values` as
`title` and, when present, `subtitle` only. Those are not form field values.
Do not read signatures, status, or a record-link field from search `values`.
Use `editor_read` for the open record's form values. FTS hits do not supply
created or updated timestamps, so do not require those keys.

A missing or blank `query` is rejected as `UNSUPPORTED_CRITERIA` unless both
`exact_field` and `exact_value` are set. A query cannot be combined with an
exact pair. `sort` and `local_date` are rejected by this adapter. The default
limit is 5 and the contract maximum is 50. An empty query cannot list every
circuit or record. Build choice labels from `title`, make them unique, and
map the selected label back to `record_id`.

### Record link write

Authorized source inspection of Android `RecordLinkValue` and `RecordLinkItemValue`
shows that `editor_update` inflates a `RecordLinkField` from an array of objects
keyed by `record_id`, not bare strings:

`{values: {field_key: [{record_id: 'record-id'}]}}`

A bare string array (`['record-id']`) is ignored by `JSONUtils.getHashMap` and
produces an empty link value. A single-link field still uses a one-element array.
Confirm the field key from the current schema before writing. Do not write a
display name or a bare string. FLOW has no completion callback, so this write
belongs in `editor_update`, not in a later data-event handler.

### New record, then navigate

The November 18 recollection of a New Record tool that accepts an app ID and
opens the new record is not supported by this Android host. Authorized source
inspection found no FLOW function with that name or behavior.

`flow_record_create_tool` is the agent-visible create alias. It delegates to
`AndroidRecordCreateHost`, which rejects every app ID outside its hard-coded
pole-inspection allowlist before creating a record. A permitted create saves
an unsynchronized local draft and does not navigate. `record_create_tool` is
registered for the same host with `exposeToAgent = false`. Neither can create
a Spans record on this host.

`record_navigate_tool` opens an existing record by `record_id` or `recordId`.
It ignores `app_id` and cannot open a blank editor. `app_open_tool` is not a
FLOW registration; its pole-inspection host returns `opened: false` and
rejects other apps. Activity navigation accepts only `home`, `dashboard`, and
`tools`. `OPENURL` remains a data event, not a FLOW tool, so a FLOW choice
cannot call it.

Do not author a FLOW path that creates a blank record in an arbitrary app and
opens it until a registered tool is verified on that build. Navigation of an
existing record can still cancel the originating FLOW. Do not claim the
previous editor remains open afterward.

### Signed-off phase

Identify who has already signed from the open record's signature fields.
`editor_read` returns `record_id` and form `values` keyed by field key. It
does not return built-in status. Read `STATUS()` in the data event if the
workflow needs it. A present signature is evidence of sign-off, not proof
that a phase transition ran or that rework is complete. Confirm the value
shape separately for a native `change` event, a data-event field read on
reopen, and a FLOW editor snapshot; do not generalize one shape to all three.

Build `ask_user` options from the effective phase. Distinguish the role
currently allowed to act from earlier signed roles that may review, and
respect an explicit rework route. See [resume a signed workflow](data-events.md#resume-a-signed-workflow).

## Invocation and scopes

The reference bridge accepts `FLOW(options)` in a data event, serializes the
options directly to JSON, and starts asynchronously. A disabled flag returns
without running. `FlowDataEventHooks.isFlowEnabled()` also requires
`dataEventDepth > 0`, so `FLOW(options)` must be called synchronously inside the
data-event handler; calling `FLOW()` from an async callback (`LOADRECORDS`,
`REQUEST`, or `LOADFILE`) is silently ignored. It does not pass a JavaScript
completion callback or return completed state; internal Android result handlers
do not change that contract. Do not infer bridge support from editor declarations
alone.

For this host, `js` nodes take a nonempty `input.expression` string, evaluated
as an expression. Function-valued `input.run` is not the wire format: JSON
serialization drops functions. Do not mix the two forms.

| Scope | Values |
| --- | --- |
| Data-event handler | `$$runtime.form` is the current form schema; `$$runtime.recordID` is the record ID. Do not use bare `form` or `recordID`. |
| FLOW JS node | `form` contains field values by data name, not schema. `state` holds prior outputs. Both are frozen snapshots. `tools` invokes registered runtime tools. |
| Other function node | Arguments go in `input`, using supported templates. Authoring-time MCP tools are not automatically available. |

A JS transformation can use `input: { expression: '({ found: state.count > 0 })' }`
after checking that `state.count` is valid. For multiple statements, a string
containing an immediately invoked function can return an object. Do not rely
on handler closures or state mutation, or put raw network APIs inside FLOW JS.
Prefer a direct function node for one tool call.

## Graph rules from the preserved parser guidance

These are authoring constraints to verify against the target shared parser,
not proof that a generated graph passes it:

- `schema_version: 1`; 1-50 nodes; the first is entry. Every node is reachable.
  IDs match `^[a-z][a-z0-9-]{0,63}$`. `end` and `abort` are reserved targets.
- `abort` is a reserved target, not a node that must be declared. It can be
  omitted from a presentation diagram, but required decision defaults and
  failure semantics must remain in the graph and be explained alongside it.
- Kinds are `function`, `decision`, and `agentic`, not `agent`.
  Function nodes specify `function` and tool-specific `input`.
- `next`, `on_error`, case `next`, and decision `default` point to an existing
  node or reserved target. Omitted function `next` ends; unhandled errors abort.
  A handled error that reaches `end` can complete normally: do not call it failure.
- A decision has a `cases` array with `{ when: { ref, op, value }, next }`
  and a required `default`. Operators: `eq`, `ne`, `gt`, `gte`, `lt`, `lte`,
  `in`, `exists`, `not_exists`; existence checks omit `value`, and `in` uses
  an array. References such as `state.found` select a flat key.
- Function `assign` selects `{{result.key}}`, `{{form.key}}`, or
  `{{state.key}}`. Never use `{{result}}` or assume nested-path traversal.
  Extract nested values first. Whole-string templates preserve JSON type.
  Without `assign`, object result keys merge into state; a non-object result
  uses the `result` key. Avoid accidental collisions.
- JS expressions have a 4096-character limit in the preserved guidance.
  Agentic instructions have a 500-character limit; verify both in the parser.
- Agentic nodes use `instruction` and an available model; do not use `assign`.
  Without an output schema, success writes `state.reply`; preserve it before a
  later agentic node replaces it. Use output-schema keys only when verified.
  Keep `interactive: false` unless prompts are required. Bound `max_calls`
  explicitly for the task; an artifact catalog does not download the model.
  Some unexpected exceptions may abort without following normal `on_error`.

Pass an object, not a JSON string, to `FLOW()`. Parentheses around a string
literal do not change its type or select among alternatives. If an editor
widens valid literals, use narrow JSDoc annotations only for the actual
diagnostic; do not cast away invalid options or remove required assignments.

## Reference Android tool families

Check exact input/result metadata, registration, permissions, and direct versus
agentic exposure on the target build. Missing dependencies can omit registrations.
Never copy names or arguments from older candidates into this baseline.

| Tool | Reference behavior |
| --- | --- |
| `editor_read` | `{}` returns `record_id` and `values`; open root editor only. |
| `editor_update` | `{values: {field_key: value}}`; returns `updated_fields`, not proof of saving. Verify field normalization and partial-apply failure behavior. |
| `record_search_tool` | App-scoped text search or one exact field/value pair, not both. Blank query, `sort`, and `local_date` are rejected. Default limit 5, maximum 50. Result `values` are `title` and optional `subtitle`, not form fields. The November 18 S25 run returned top-level `has_more`, `match_count`, and `records`. |
| `record_create_tool` | Creates a locally persisted draft and does not navigate. This host rejects app IDs outside two hard-coded pole-inspection apps. There is no verified New Record tool that creates and opens an arbitrary app's record. |
| `record_update_tool` | Persists changes, unlike editor tools. Read current shared schemas before building inputs; update uses a field key/value. |
| `record_navigate_tool` | Accepts `record_id` or `recordId`; returns `destination_id` and `navigated`. `app_id` is ignored, not a scope guard. |
| `current_location_tool` | Device location; requires the location host and permission. |
| `find_nearest_records` | Direct-node nearest search; optional coordinates/radius and app scope. Omitted `form_id` searches across apps. Verify GPS sentinel and default behavior. |
| `ask_user` | Typed/choice prompt described below; also available to eligible agentic nodes. |
| `voice_assistant` | Function-only `{message, listen?}`; listen defaults true. Listening returns `answer` and `input_mode`; speech-only returns `spoken`. |
| `photo_capture_tool` | Function-only; optional `camera: 'front'` or `'back'`, omission requests front. Returns `photo_id`. Verify actual camera/fallback behavior. |
| `photo_analyze_tool` | Function-only `{photo_id}` from the same run/account; returns `findings` and `confidence`. It does not take another photo. |
| `flow_record_add_attachment_tool` | `{photo_id, field_key}` queues the run-owned capture in the open editable root record. Returns `attachment_id`, `record_id`, `queued: true`; not processed/saved proof. |
| `record_add_attachment_tool` | Saved-record route with `{app_id, record_id, photo_id}`; persists into the first photo field, rejects the currently open record. |

Agent-visible mutation aliases include `flow_record_create_tool`,
`flow_record_update_tool`, and `flow_saved_record_add_attachment_tool`.
Nearest search uses `flow_find_nearest_records` for agent exposure. Do not
assume all direct-node tools are agent tools. This baseline generates mutation
idempotency keys per invocation; do not supply unsupported keys or assume
retries across invocations are deduplicated. Direct writes need not display
an additional confirmation; user-approved workflow design is still required.

Authorized inspection of this worktree confirms the same create limit.
`flow_record_create_tool` and `record_create_tool` both delegate to
`AndroidRecordCreateHost`, which rejects app IDs outside its pole-inspection
allowlist before creating a record. A permitted create saves an unsynchronized
local draft and does not navigate. It also skips field values it cannot
resolve or normalize, so do not assume every requested value was applied.
The November 18 new-record recollection does not override this host.
`record_navigate_tool` still requires an existing record ID. `OPENURL` remains
a data-event function, not a FLOW tool or FLOW JavaScript global. A FLOW
choice cannot call it.

### Prompts, records, and media

`ask_user` requires a nonblank `question`. Kinds are `text`, `alert`,
`confirmation`, `single_choice`, `multi_choice`, and `action_list`.
List kinds require unique nonblank `options`; other kinds must not have options.
`allow_empty` is for text/multi-choice only and defaults true; `initial_value`
is text-only. Results contain one of `answer`, `answers`, or `confirmed`.
An alert returns `answer: 'acknowledged'`. Cancellation stops the run, rather
than returning false or an empty answer. Voice may fall back to typed input
for permission/recognition failures; cancellation is not a typed fallback.

Search covers locally available authorized records, not necessarily every
organization record. Results may be limited summaries, not full field values.
Do not infer completeness or uniqueness from count/`has_more`. The inspected
local exact-date fallback can match an ISO date in another primitive field:
verify the actual intended field and timezone before a date-sensitive decision.
Distinguish "latest updated" from "latest created" and verify ordering/coverage.

Root editor tools are not repeatable-editing tools. Schema choices are allowed
answers, not saved answers. A catalog's schema tool is usable only if the host
actually registers it. Assignment, notifications, atomic multi-record stage
changes, editor discard, and save-blocking must not be invented.

Capture only with agreed user interaction; an OS camera grant is not approval
to attach or save. Capture once, analyze that capture, and preserve existing
photos when queuing. Verify processing, save/cancel, ownership, cleanup, and
source lifetime before choosing attachment-versus-analysis ordering. A queued
attachment ID is not a replacement for the capture ID used by analysis.
Never substitute a second capture or immediate persistence for a draft edit.
Malformed model output is failure, not findings or a safety conclusion.

### Open editor: value formats and mutation boundaries

The reference `editor_read` returns `values` from the root record's serialized
form values, keyed by field **key**. By contrast, the initial FLOW `form`
snapshot is keyed by data name. Both are snapshots: neither tracks subsequent
editor changes. A record ID alone does not establish that the same editing
session or account is still active.

The reference `editor_update` accepts an object mapping field keys to values.
It resolves and normalizes all requested fields before applying them; a
normalization failure therefore precedes application. It applies the staged
values sequentially and silently, with no demonstrated rollback if application
itself fails. It updates the open editor, not durable storage, and rejects a
view-only or nested editor. It cannot change built-in status. Its silent
application bypasses the ordinary field `change` event and does not itself
perform the normal user-edit calculated-field refresh. Do not depend on either
side effect without separate target-build evidence.

For the reference normalizer:

- A choice accepts a string, an array of strings, or an object containing
  both `choice_values` and `other_values` arrays. Strings can match a configured
  value or an unambiguous label, case-insensitively; canonical values are stored.
  Other values require that the field permits them, and a single-choice field
  cannot contain more than one total selection.
- A yes/no field accepts a string matching an unambiguous configured choice
  value or label, not a boolean. Available choices come from the actual form.
- `null` clears a field; other field types must be compatible with their
  actual serialized form-value representation. Do not infer formats for
  signatures, record links, dates or attachments from their display labels.

Read current values immediately before a proposed update and compare the
relevant fields against the user's starting values; if they changed, stop and
ask instead of overwriting them. A separate read and update is **not** an atomic
compare-and-set: edits may still intervene. Without a verified atomic guard or
an agreed interaction that prevents conflicting edits, do not claim the update
fully protects concurrent user edits. Never replay a failed multi-field update
without first checking what was actually applied.

### Native signature and photo events

The reference native signature editor returns either a new signature or a
clear operation. On successful signature creation, its value contains
`signature_id` and `timestamp`; the time originates on the device when the
signature save task is created. Clearing passes a null field value, and
replacement creates a new value. The editor routes these native operations
through its ordinary field-change path, whose `value` is the serialized value
or null. This source behavior does not prove a signature is persisted or
synced, nor does the signature value itself establish the signer's identity.
**Device-verified on the November 19, 2026 S25 Spans POC run:** Android rejects
clearing a `SignatureField` from a script. `SETVALUE` reports that setting the
signature value is not supported and aborts the handler. `editor_update` and
`record_update_tool` with `null` also leave the ink in place. Do not retry
those writes. Leave the signature and clear only companion name and date
fields, or ask the person to clear it on the native signature pad.
Verify event delivery, identity, clock, and clear/replacement behavior on the
target before relying on automatic signer stamps or downstream resets.

### Signature stamps and status

These contracts come from public Fulcrum documentation and fulcrum-core
1.6.15 (`9c6f746e4a4b6d48207da7db4e10eed5db4df02c`, 2026-11-17), not from a
new application-source inspection:

- Listen on ordinary `change` for the signature data name. A present value has
  a non-empty `signature_id`. `null` means cleared. Replacement is a new value.
  `SETVALUE()` does not fire `change`, so stamps written from this handler do
  not re-enter it.
- `USERFULLNAME()` returns the documented current user's full name. Data-event
  guidance also says scripts run in the record creator's context, not
  necessarily the viewing user's context. A name stamp is therefore not proof
  of who signed. Skip the name write when the function returns blank, so a
  typed name is not wiped. Device-verify the name before treating it as the
  signer.
- `STATUS()` returns the current status value. `SETSTATUS(value)` sets a valid
  status option and does not fire `change-status`. `editor_update` cannot
  change built-in status, so a signature-driven status change belongs in this
  ordinary handler, not in a FLOW editor update.
- Advance only from the agreed starting status, and only when the controlling
  answer is an unambiguous stored value. Missing or unexpected answers must
  not change status. Do not infer that clearing a signature reverts status.
- `SETVALUE` documents a date as `YYYY-MM-DD` and a time field as `HH:mm`.
  The Records API signature example stores
  `{"timestamp":"2015-07-09T14:54:04Z","signature_id":"..."}`. fulcrum-core
  serializes that timestamp with `Date.prototype.toISOString()` and validates
  a `DateTimeField` text value only when it is exactly `YYYY-MM-DD`.
- **Unverified:** a clock-bearing `SETVALUE` for `DateTimeField`. Do not present
  `YYYY-MM-DDTHH:mm:ss` or a `Z` timestamp as a supported DateTime write. A
  date-only stamp is the only format those public sources validate. Confirm
  the installed editor before promising a time of day.

For reference photo processing, the editor's `add-photo` event receives the
photo ID, URI and file size, plus EXIF data when available for JPEGs. A
timestamp is not guaranteed by this construction. The event occurs before
photo acceptance; validation or processing may subsequently fail. A queued
FLOW photo initially reserves a temporary editor value and reports queueing,
not final processing or save. Therefore, neither that event nor `queued: true`
alone proves a successful saved attachment or an authoritative work time.
Verify the actual capture/import, event order, timezone, photo removal and
replacement behavior on the target before deriving first/last-photo milestones.
If required semantics cannot be established, obtain agreement for a different
process rather than fabricating times or success.

### Lifecycle and prompts

The reference host replaces active FLOW sessions when another FLOW starts;
fragment stop, view destruction, or host clearing also stops the run. A prompt
can be interrupted by these lifecycle events, and cancellation is not a
negative answer. The prompt metadata has a one-hour timeout; this is not a
guarantee that a run survives navigation or backgrounding.

Prompt `kind` defaults to `text`, or `action_list` when options are present.
`positive_label` and `negative_label` are optional nonblank strings;
`action_list` has no positive button and `alert` has no negative button.
`initial_value` is text-only; `allow_empty` is valid only for text and
multi-choice. A valid response contains exactly one of `answer`, `answers`,
or `confirmed`; choice answers must match the supplied options.

## Source evidence

All links are pinned to the same Android revision:

- [Bridge and registry](https://github.com/fulcrumapp/fulcrum-android/blob/270f21660edb45f57d43eec203cedbe0bf02f0c2/app/src/main/java/com/spatialnetworks/fulcrum/app/flow/FlowDataEventHooks.kt)
- [JS evaluator](https://github.com/fulcrumapp/fulcrum-android/blob/270f21660edb45f57d43eec203cedbe0bf02f0c2/app/src/main/java/com/spatialnetworks/fulcrum/app/flow/J2V8FlowJavaScriptRuntime.kt)
- [Editor tools](https://github.com/fulcrumapp/fulcrum-android/blob/270f21660edb45f57d43eec203cedbe0bf02f0c2/app/src/main/java/com/spatialnetworks/fulcrum/app/flow/FlowEditorTools.kt)
- [Record tools](https://github.com/fulcrumapp/fulcrum-android/blob/270f21660edb45f57d43eec203cedbe0bf02f0c2/app/src/main/java/com/spatialnetworks/fulcrum/app/flow/FlowRecordTools.kt)
- [Record creation host](https://github.com/fulcrumapp/fulcrum-android/blob/270f21660edb45f57d43eec203cedbe0bf02f0c2/app/src/main/java/com/spatialnetworks/fulcrum/app/chat/tools/RecordToolRegistrations.kt)
- [Record creation allowlist](https://github.com/fulcrumapp/fulcrum-android/blob/270f21660edb45f57d43eec203cedbe0bf02f0c2/app/src/main/java/com/spatialnetworks/fulcrum/app/chat/tools/PoleInspectionToolRegistrationSupport.kt)
- [FLOW dependency registration](https://github.com/fulcrumapp/fulcrum-android/blob/270f21660edb45f57d43eec203cedbe0bf02f0c2/app/src/main/java/com/spatialnetworks/fulcrum/app/flow/AndroidFlowAgenticModelCatalog.kt)
- [Location tools](https://github.com/fulcrumapp/fulcrum-android/blob/270f21660edb45f57d43eec203cedbe0bf02f0c2/app/src/main/java/com/spatialnetworks/fulcrum/app/flow/FlowLocationTools.kt)
- [Prompt parser](https://github.com/fulcrumapp/fulcrum-android/blob/270f21660edb45f57d43eec203cedbe0bf02f0c2/app/src/main/java/com/spatialnetworks/fulcrum/app/flow/FlowAskUserTool.kt)
- [Photo capture and analysis](https://github.com/fulcrumapp/fulcrum-android/blob/270f21660edb45f57d43eec203cedbe0bf02f0c2/app/src/main/java/com/spatialnetworks/fulcrum/app/flow/FlowPhotoAnalyzeToolRegistration.kt)
- [Attachment modes](https://github.com/fulcrumapp/fulcrum-android/blob/270f21660edb45f57d43eec203cedbe0bf02f0c2/app/src/main/java/com/spatialnetworks/fulcrum/app/flow/FlowRecordAttachmentTool.kt)
- [Local search caveats](https://github.com/fulcrumapp/fulcrum-android/blob/270f21660edb45f57d43eec203cedbe0bf02f0c2/app/src/main/java/com/spatialnetworks/fulcrum/app/chat/LocalWorkflowStructuredRecordSearchRepository.kt)
- [Editor value normalization](https://github.com/fulcrumapp/fulcrum-android/blob/270f21660edb45f57d43eec203cedbe0bf02f0c2/app/src/main/java/com/spatialnetworks/fulcrum/app/chat/tools/AndroidRecordUpdateHost.kt)
- [Native signature value](https://github.com/fulcrumapp/fulcrum-android/blob/270f21660edb45f57d43eec203cedbe0bf02f0c2/app/src/main/java/com/spatialnetworks/fulcrum/model/field/attachment/signature/SignatureValue.java)
- [Signature editor](https://github.com/fulcrumapp/fulcrum-android/blob/270f21660edb45f57d43eec203cedbe0bf02f0c2/app/src/main/java/com/spatialnetworks/fulcrum/app/SignatureActivity.java)
- [Record editor](https://github.com/fulcrumapp/fulcrum-android/blob/270f21660edb45f57d43eec203cedbe0bf02f0c2/app/src/main/java/com/spatialnetworks/fulcrum/app/RecordEditorFragment.java)
- [Photo processing](https://github.com/fulcrumapp/fulcrum-android/blob/270f21660edb45f57d43eec203cedbe0bf02f0c2/app/src/main/java/com/spatialnetworks/fulcrum/app/RecordEditorFragmentExtensions.kt)
- [Photo event construction](https://github.com/fulcrumapp/fulcrum-android/blob/270f21660edb45f57d43eec203cedbe0bf02f0c2/app/src/main/java/com/spatialnetworks/fulcrum/model/javascript/expression/ExpressionEvents.java)
- [Draft photo queue](https://github.com/fulcrumapp/fulcrum-android/blob/270f21660edb45f57d43eec203cedbe0bf02f0c2/app/src/main/java/com/spatialnetworks/fulcrum/app/RecordEditorFlowPhotoQueue.kt)
- [FLOW run lifecycle](https://github.com/fulcrumapp/fulcrum-android/blob/270f21660edb45f57d43eec203cedbe0bf02f0c2/app/src/main/java/com/spatialnetworks/fulcrum/app/flow/FlowDataEventRunHost.kt)
