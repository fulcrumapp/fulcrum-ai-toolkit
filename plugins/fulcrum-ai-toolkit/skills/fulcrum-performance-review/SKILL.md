---
name: fulcrum-performance-review
description: Evaluate performance whenever authoring, modifying, or reviewing Fulcrum code, including small snippets, Data Events, calculations, reports and SQL, App Extensions, integrations, and migration or GIS scripts. Review workload growth, repeated I/O, rendering, memory, and offline behavior; distinguish static risks from measured results.
---

# Fulcrum Code Performance Review

Perform a performance evaluation for **every code artifact** authored, modified,
or reviewed, before presenting it as ready or persisting it. This includes
generated code and small edits, not just code that already looks slow.
For an edit, inspect the complete affected execution path, including existing
handlers, helpers, queries, and dependencies; reviewing only added lines can
miss the dominant cost.

The evaluation is mandatory; adopting optimization advice is not. Scale the
review to the change: a constant-time calculation may need one sentence,
while a multi-query report needs a workload and cost breakdown.
When no code is involved, say "No code changes; performance code review N/A"
rather than inventing a code assessment.

## Evaluation Workflow

1. **Identify runtime and trigger.** Name the artifact and revision, where it
   runs (mobile/web, report renderer, query service, or integration worker),
   what triggers it, and how often that trigger can occur.
2. **Define workload.** Record typical and expected upper-bound field,
   repeatable, record, lookup, image, page, and payload sizes as applicable.
   Label estimates and unknowns. Use the user's responsiveness/rendering
   budget when provided; do not invent universal millisecond or size limits.
3. **Trace cost.** Inspect loops, nested scans, repeated sorts, expression
   reevaluation, database/network calls, serialization/copies, DOM work, and
   retained state. Explain growth in relevant terms: for example, a scan of
   `m` lookup rows for each of `n` items costs `n * m` comparisons.
4. **Check the runtime-specific risks below.** Consider empty, typical,
   expected-large, slow-network, offline, and failure paths where relevant.
   Missing code or workload evidence makes the affected conclusion unknown.
5. **Recommend the smallest useful improvement.** Prefer native behavior,
   bounded queries, fetching shared data once, indexed in-memory lookups,
   scoped caching, or reducing rendered/media data. Preserve correctness,
   freshness, permissions, output completeness, and offline behavior.
6. **Summarize before delivery.** State risk, evidence, likely user impact,
   improvements and trade-offs, and what remains unmeasured. Reevaluate after
   changes; do not assume that fewer lines or fewer requests means faster code.

## Runtime-Specific Review

| Artifact | Risks to evaluate | Constructive alternatives |
| --- | --- | --- |
| Data Events | Whole-form/lookup scans on every field change; repeated `LOADRECORDS()` or network calls; repeated handler registration; indirect calculation-trigger chains; expensive synchronous validation/save paths; growing device storage | Move work to the correct lifecycle event, reuse fetched data within a valid scope, pre-index lookups, bound results, and keep required synchronous paths small |
| Calculations | Repeated scans/sorts across large repeatables; duplicated derived logic; expensive geometry/string processing on reevaluation | Reuse suitable built-ins and shared results; explain dependencies and scaling rather than assuming a short expression is cheap |
| Reports | `QUERY()`/`API()`/media lookups inside row loops (N+1 calls); repeated cross-app queries; join multiplication; unrestricted history; large HTML/DOM, tables, images, and page counts | Fetch related data once through supported interfaces, select/filter/aggregate early, reuse lookups, and size media for the deliverable without omitting required content |
| SQL and spatial work | Unbounded scans; unnecessary columns; many-to-many join explosions; repeated subqueries; sorting or spatial operations before narrowing the dataset | Bound time/space and rows, preserve grain/cardinality, choose explicit join keys, and inspect plans only through an authorized interface that actually supports them |
| App Extensions | Large bridge payloads and copies; repeated full rendering; large DOM lists/images; unbounded listeners or retained state; redundant host/page calculations | Pass only needed data, bound/search/page large lists, reuse host-derived values, and clean up lifecycle state |
| Integration, migration, and GIS scripts | One request per item; unbounded concurrency, retries, or queues; reading entire datasets/media into memory; repeated downloads; costly geometry transformations | Use supported batching/pagination, bounded concurrency and retry budgets, streaming where supported, and explicit checkpoints/backpressure |

Excessively complex **Data Events and reports can cause performance problems**:
slow record editing/saving, long report generation, timeouts, and memory
pressure. The toolkit's roughly 500-line Data Event and 300-line report
warnings are review prompts, not proof of slowness or automatic score caps.
A short query inside a loop can cost more than a long, linear script.
Conversely, well-structured longer code may be appropriate for a bounded job.

Use the owning runtime skill for API contracts. For example, `SETVALUE()` does
not itself fire `change`; calculated values affected by it can fire events.
Do not "optimize" synchronous validation by moving required checks into
asynchronous work, or cache tenant/record data in an unscoped device-wide key.
Do not truncate a required report/export to hide a performance problem.

## Evidence And Measurement

Static review is the default and must be labeled **Static assessment**.
Describe a plausible bottleneck and its trigger/input growth; do not claim
an observed slowdown, measured speedup, or a passed latency target from source
inspection, line count, parser success, or a tiny fixture.

When measurement is already authorized and available, record **Measured**
evidence separately: artifact revision, device/runtime, dataset cardinality,
network/cache conditions, repeated runs, and elapsed time, request count,
payload size, memory, or rendered page count as applicable. Compare changes
under equivalent conditions and verify output correctness.

If meaningful evidence is unavailable, state **Unmeasured** and propose a
bounded, representative check. Do not run production load tests, execute
untrusted scripts, query customer data, generate reports, or make live writes
merely to complete this evaluation. Respect the caller's authorization and
read-only boundaries; App MCP is not a Query API executor.

## Required Summary

Include one concise performance summary for each code artifact, or a table
with `Artifact | Runtime/workload | Risk | Evidence | Advice/trade-off`.
Use these risk labels consistently:

- **Low:** inspected work is bounded and no material bottleneck is identified
  for the stated workload; this is not a runtime guarantee.
- **Moderate:** a plausible hotspot needs a bounded mitigation or measurement.
- **High:** an evident unbounded/fan-out path or measured budget violation
  threatens the intended workflow; explain the mechanism and evidence.
- **Unknown:** missing code, workload, or runtime facts prevent an assessment.

For a small change, for example: "Static assessment: low risk for this
constant-time arithmetic expression; no I/O or growing collection work.
Runtime timing unmeasured." For a report with a query per row: "Static
assessment: high risk at the expected volume; one query per row makes request
count grow with row count. Fetch related data once and map it locally, at the
cost of retaining a bounded lookup. Render timing is unmeasured."

Be specific and respectful: explain what works, the potential field-user or
report-consumer impact, and a realistic alternative. The user may **proceed
as-is** after seeing the trade-off. Record that decision without repeatedly
pressuring them or silently changing code. Acknowledgment does not turn an
unknown into measured evidence, erase a finding, or increase an app score.
Correctness, credential protection, authorization, and destructive-change
requirements are not optional performance advice.

When part of app design approval, provide this summary to
[the app builder](../fulcrum-app-builder/SKILL.md) alongside
[the scorecard](../fulcrum-app-scorecard/SKILL.md). Feed findings into relevant
rubric checks; risk labels are not extra points, deductions, or caps.

## Completion Criteria

- [ ] Every supplied or changed code artifact has an evaluation before delivery
- [ ] Workload, trigger frequency, and growth/repeated I/O were considered
- [ ] Static conclusions, measurements, and unknowns are clearly distinguished
- [ ] Advice preserves behavior and permits informed, authorized acceptance

## References

- [Data Events](../fulcrum-data-events/SKILL.md)
- [Reports](../fulcrum-report-building/SKILL.md)
- [Extensions](../fulcrum-app-extensions/SKILL.md)
- [Query API](../fulcrum-query-api/SKILL.md)
- [Fulcrum developer documentation](https://docs.fulcrumapp.com/)
