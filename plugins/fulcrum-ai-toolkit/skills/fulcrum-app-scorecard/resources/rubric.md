# App Design Rubric 1.0.0

The ten areas below each contain two equally weighted checks. Score each
check independently using [the scorecard arithmetic](../SKILL.md#scoring-arithmetic).
The check wording, weights, and CAP-01 ceiling are toolkit policy derived from
the linked guidance, not product guarantees.

## Checks

| ID | Area | Pass condition and evidence to inspect | N/A policy |
| --- | --- | --- | --- |
| GOAL-01 | Purpose | The owner confirms a one-sentence goal, named deliverable, and intended field/office audiences. Inspect requirements or owner confirmation; the app name alone is insufficient. | Never |
| GOAL-02 | Purpose | Every field group serves that goal or a confirmed operational/safety requirement. Trace groups to the deliverable or workflow; flag orphan groups. | Never |
| STRUCT-01 | Structure | The single-app versus linked-app decision matches roles, visits, locations, and record lifecycles. Independent entities or activities are not forced into one growing record. Inspect the entity/lifecycle map and schema together. | Never |
| STRUCT-02 | Structure | Relationships and shared reference data have a clear source of truth. Child activities link to their parent; shared lists/lookups are maintained centrally rather than copied between apps. A genuinely self-contained workflow passes without adding links. | Never |
| FIELD-01 | Data quality | Every input uses the most constrained suitable field type, and required fields match actual capture requirements without blocking legitimate cases. Inspect types, required rules, and relevant workflow scenarios. Respect documented extension-picker exceptions. | Never |
| FIELD-02 | Data quality | Labels are understandable to intended users; choice options are distinct and cover valid responses; stored values are reviewed and stable for reports/integrations. Inspect field labels, choices, and consumers. No choices means only the label condition applies. | Never |
| MOBILE-01 | Complexity | The form has at most 80 input/calculation fields across all nesting, or representative mobile evidence justifies exceeding that design guideline. Count each field definition once, excluding Section and Repeatable containers. At 81+ without performance evidence, mark unknown; observed unusable scrolling/latency fails regardless of count. | Never |
| MOBILE-02 | Complexity | Variable-count data and lookups are bounded appropriately for field use: no numbered duplicate groups, indefinitely growing repeatables, or unbounded pickers. Repeatables, if present, are focused, titled, parent-owned items without independent lifecycles. Inspect schema and expected cardinality; check mobile evidence when regular repeatable volume exceeds about 20 or link results about 100. | Never |
| FLOW-01 | Lifecycle | If record status is needed, the built-in status system and authorized transitions are used rather than a competing custom status choice field. Multiple unrelated lifecycle controls are not mixed. Confirm that a no-status workflow genuinely needs none before passing it. | Never |
| FLOW-02 | Lifecycle | Simple visibility uses native rules; calculations own derived values; Data Events own lifecycle side effects. Inspect rules and expressions for unnecessary duplication, valid result semantics, and appropriate responsibilities. A native-only form with no such behavior can pass once confirmed. | Never |
| LOGIC-01 | Automation | Data Events use documented hooks, valid field references, correct open/change initialization, synchronous validation/save behavior, and required geometry guards. Inspect the full script and referenced helpers against current contracts. | Only when the full configuration confirms no Data Events or loaded helpers |
| LOGIC-02 | Automation | Automation is organized by concern, reuses suitable built-ins/shared logic, and avoids hardcoded resource IDs. Scripts above about 500 lines have a documented decomposition decision and maintainability evidence. Inspect the complete script and helpers, not line count alone. | Same as LOGIC-01 |
| OFFLINE-01 | Reliability | Connectivity requirements are explicit, and scripts, reference data, maps, and extension assets satisfy them. Required offline paths have representative offline evidence; an explicitly online-only workflow is not penalized solely for needing connectivity. | Never |
| OFFLINE-02 | Reliability | External dependencies have verified availability and versions where applicable, bounded requests/payloads, and explicit error/unavailable-state handling. Required capture does not silently succeed after a failed dependency. Inspect dependencies and representative failure evidence. | Only when configuration and workflow confirm no external/runtime dependencies |
| EXT-01 | Extensions | Each extension solves a custom UI need that native fields cannot reasonably meet, without replicating a standalone app or duplicating calculations. Picker targets follow the TextField/RecordLinkField contract, not a competing ChoiceField UI. | Only when the full configuration confirms no extensions |
| EXT-02 | Extensions | The current bridge/bootstrap and payload shape are respected, inputs are checked, data exchange is bounded, and write-back targets correct fields while preserving unrelated handlers. Inspect HTML, trigger, and callback together. | Same as EXT-01 |
| OUTPUT-01 | Deliverable | Required output data is captured and reachable through a documented report/export/query path, including linked/repeatable data. No large JSON-in-field workaround substitutes for a proper multi-record query. Inspect the data-to-output mapping. | Never; the deliverable need not be a PDF |
| OUTPUT-02 | Deliverable | Representative output was checked for correctness, missing/empty data, and larger datasets. For reports, also inspect rendering, media, tables, and pagination; for datasets, inspect schema/values and joins. A template that merely parses is not runtime evidence. | Never; absent output evidence is unknown |
| PROTECT-01 | Protection | Effective role plus resource access matches intended actors; visibility/client logic is not an access boundary; scripts, templates, extensions, and Reference Files contain no credentials. Inspect access evidence and all relevant artifacts without reproducing secrets. | Never |
| PROTECT-02 | Protection | For hazardous field work, the owner confirms proportional pre-work safety documentation and its placement before work begins. Flag missing, late, or mismatched safety prompts; do not prescribe a safety program. | Only when the owner confirms no relevant physical hazards |

Within a check, a confirmed violation is a fail. Missing evidence with no
confirmed violation is unknown. Do not fail merely because a recommended
feature is absent when the check's purpose is already met. N/A requires the
explicit evidence specified above, not a missing script/template export.

The field-count, volume, and script-size thresholds are design warning
signals from existing skills, not additional caps. A correctly designed
repeatable can pass STRUCT-01 and MOBILE-02 while still triggering CAP-01.
Repeatables can be queried through their Query API tables; do not report
them as unqueryable merely because they are nested in a record.

## Guidance And Remediation Map

| Checks | Owning skills | Improvement direction |
| --- | --- | --- |
| GOAL-01, GOAL-02 | [App goal](../../fulcrum-app-goal/SKILL.md), [discovery](../../fulcrum-discovery/SKILL.md) | Clarify the audience/output, then remove or relocate orphan field groups. Request consent before starting a discovery interview. |
| STRUCT-01, STRUCT-02 | [App design](../../fulcrum-app-design/SKILL.md), [decomposition](../../fulcrum-workflow-decomposition/SKILL.md) | Separate independent lifecycles, link child activity to parent, centralize shared data. |
| FIELD-01, FIELD-02 | [App design](../../fulcrum-app-design/SKILL.md) | Constrain inputs, simplify prompts, preserve stored choice values and existing integrations. |
| MOBILE-01, MOBILE-02 | [App design](../../fulcrum-app-design/SKILL.md), [decomposition](../../fulcrum-workflow-decomposition/SKILL.md) | Reduce irrelevant fields, bound selections, model repeating data rather than duplicating fields; measure real mobile behavior. |
| FLOW-01, FLOW-02 | [App design](../../fulcrum-app-design/SKILL.md), [Data Events](../../fulcrum-data-events/SKILL.md) | Use native status/visibility/calculation behavior before custom lifecycle code. |
| LOGIC-01, LOGIC-02 | [Data Events](../../fulcrum-data-events/SKILL.md), [decomposition](../../fulcrum-workflow-decomposition/SKILL.md) | Correct event contracts, simplify handlers, verify referenced fields, and extract shared logic. |
| OFFLINE-01, OFFLINE-02 | [Data Events](../../fulcrum-data-events/SKILL.md), [extensions](../../fulcrum-app-extensions/SKILL.md), [GIS](../../fulcrum-gis-mapping/SKILL.md), [integrations](../../fulcrum-integration-patterns/SKILL.md) | Package offline dependencies or confirm an online-only workflow; make failures explicit and verify platform eligibility. |
| EXT-01, EXT-02 | [Extensions](../../fulcrum-app-extensions/SKILL.md) | Narrow UI scope and correct bridge, picker, and write-back contracts. |
| OUTPUT-01, OUTPUT-02 | [Reports](../../fulcrum-report-building/SKILL.md), [Query API](../../fulcrum-query-api/SKILL.md) | Preserve output continuity, use supported data paths, and inspect representative deliverables. |
| PROTECT-01, PROTECT-02 | [Access](../../fulcrum-access-management/SKILL.md), [Data Events](../../fulcrum-data-events/SKILL.md), [safety](../../fulcrum-safety/SKILL.md) | Enforce real permissions, keep secrets out of client artifacts, and confirm risk-appropriate safety documentation. |

## Cap Registry

| ID | Predicate | Ceiling | Absence evidence | Rationale and remediation |
| --- | --- | --- | --- | --- |
| CAP-01 | At least one `Repeatable` anywhere in the selected form's element tree | 6 | Complete tree inspected with no Repeatable elements; partial/filtered trees cannot prove absence | Explicit scorecard policy favoring simpler top-level/linked models. Keep appropriate repeatables and explain the cap; consider linked children only when lifecycle, growth, or deliverable needs justify them. |

CAP-01 is the only cap in version 1.0.0. There is no waiver for a small,
well-designed repeatable and no additional deduction merely for its presence.
Even one repeatable found in an incomplete tree establishes the cap;
completeness is necessary only to establish absence.

## References

- [Fulcrum developer documentation](https://docs.fulcrumapp.com/)
- [Field types and Repeatable elements](../../fulcrum-app-design/resources/field-type-reference.md)
- [Query API modeling](../../fulcrum-query-api/SKILL.md)
