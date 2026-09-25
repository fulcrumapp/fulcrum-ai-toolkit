# Design Approval And Performance Scenarios

These synthetic scenarios describe expected agent behavior. Repository
contract checks protect the guidance text and links; they do not prove host
activation, live app inspection, or measured runtime performance.

| Scenario | Expected confirmation and follow-through |
| --- | --- |
| Create an app with a small, appropriate Repeatable | Show the proposed score/range with the 6/10 ceiling, strengths, and a useful alternative only if it fits the workflow. Offer revision or proceeding; do not silently replace the repeatable. |
| Edit one field in an existing app | Inspect the current full form and compose the post-edit state. Include unchanged repeatables, code, and dependencies in the assessment. Show the proposed score and advice, not a grade for the changed field alone. |
| Create without runtime fixtures or a connector | Include an explicitly provisional or not-scoreable result and explain missing evidence. Offer an approved implementation handoff; do not invent measured output/performance or claim a live create. |
| User declines advice | Acknowledge the chosen trade-off once, keep the honest score/findings, and proceed after explicit approval if the design is valid and authorized. Do not require a minimum score or repeatedly recommend the same rejected optimization. |
| Code is generated after schema approval | Evaluate the actual generated artifact before writing it. If it adds material latency/fan-out risk or changes the score/design, show the refreshed score and advice for approval before persistence. |
| One-line calculation | Evaluate its execution frequency and input growth. Constant-time arithmetic with no I/O can receive a concise low-risk static assessment; short code that scans an unbounded repeatable cannot be excused because it is one line. |
| Report queries once per output row | Identify N+1 fan-out, state expected row count or its absence, recommend a bounded shared fetch, and label timing unmeasured unless evidence exists. User may accept the performance trade-off without being promised a fast report. |
| Data Event reloads a large lookup on every change | Evaluate trigger frequency, repeated I/O, memory, and offline/failure behavior. Suggest correctly scoped reuse or a more suitable lifecycle trigger without moving required synchronous validation into an async callback. |
| Long but bounded report or Data Event | Review the real work and expected volume. Do not declare it slow solely because it exceeds a line-count warning, and do not add a new score cap. |
| Advice conflicts with a mandatory safeguard | Explain the actual correctness, secret-protection, authorization, or destructive-change blocker. "Proceed anyway" applies to advisory trade-offs, not bypassing the safeguard. |
| Form changes after approval | Compare the fresh read with the assessed revision, preserve intervening changes, and obtain updated approval if the design, score, caps, or risks changed materially. |
| No code in the design | Include the app score and advice; state that code performance is N/A rather than manufacturing an evaluation. |
| Extension code arrives as an attachment | Inspect the HTML contents, inline handlers/scripts/styles, and referenced files, not only the Data Event launcher. Inventory nested bundles and loaded code without executing attachment content. |
| Data Event loads a shared Reference File | Follow `LOADFILE()` through the helper and its transitive dependencies, including unchanged/cross-form code. Attribute findings to the actual file and affected execution path. |
| Attachment cannot be inspected | Name the unreviewed file and reason in the approval summary, keep affected performance/checks unknown unless a violation is established, and request the smallest readable source. Do not call the app code-free or low risk from its wrapper alone. |
| Code is hidden behind a misleading extension or encoded string | Inspect actual content with bounded static tooling; do not execute or render it to discover behavior. If it cannot be resolved safely, mark the dependency unreviewed instead of skipping it. |
| Large Reference Files change frequently | Include a separate advisory sync warning with known sizes/update cadence and measurement limits, even for non-code files. Offer proportionate options that preserve offline use; size/frequency alone does not reduce the score or add a cap. |

## References

- [Builder confirmation contract](../SKILL.md#score-and-advice-at-every-design-confirmation)
- [Scorecard](../../fulcrum-app-scorecard/SKILL.md)
- [Code performance review](../../fulcrum-performance-review/SKILL.md)
- [Fulcrum developer documentation](https://docs.fulcrumapp.com/)
