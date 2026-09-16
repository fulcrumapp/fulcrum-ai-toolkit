# Pre-Write Freshness And Artifact Consistency

Apply this safeguard immediately before each live form, script, Reference File,
or Report Template write, through App MCP or the manual UI. Review/approval
of an earlier snapshot is not proof that the live target is still unchanged.
Use current registered schemas; this guide does not add tool parameters.

## Before Each Write

1. **Capture the approved baseline.** Record the exact target identity, current
   revision or content fingerprint, proposed content, approved edits/removals,
   and relevant dependency/consumer versions when first reviewing the change.
   For a proposed new file/template, record that the target does not exist.
2. **Always read current state immediately before writing.** Fetch the full
   target plus relevant dependencies and known consumers, even if no change is
   known. For Reference Files, compare actual content or a trustworthy
   content hash/revision, not the filename alone. Recheck that a new target has
   not appeared since approval; do not accidentally replace it.
3. **Reconcile, do not replay.** Compare current state with the approved
   baseline and apply only the approved edits to the latest state, preserving
   intervening unrequested fields, choices, handlers, and file/template changes.
   Recompute removal keys from the fresh form and explicit removal approval;
   never reuse a stale full payload or removal list. If changes conflict,
   resolve the intended result explicitly instead of silently choosing a side.
4. **Revalidate and re-review.** Validate changed composed forms with the
   registered validator; check code and its dependency composition. Refresh
   score, performance advice, and affected-consumer risks. Obtain updated
   approval for material differences, then repeat the fresh read after
   approval. Do not jump straight from renewed approval to a write.
5. **Write the final reviewed, approved content.** Use a supported revision
   precondition when the live interface provides one. Do not invent an ETag
   or concurrency argument. Without conditional writes, this read/reconcile
   workflow reduces stale writes but is not atomic; disclose the residual
   race and stop if concurrent edits cannot be reconciled reliably.

If current content or its revision cannot be inspected reliably, report that
freshness is unverified and stop the affected write rather than claiming
preservation. Do not broaden permissions or execute attachment code to inspect it.

## Coupled Reference File And Script Writes

An upload/replacement is itself a live change: existing consumers may load
the new file before any form-script update. Run the pre-write safeguard
before the upload, including known consumers and dependencies.

After uploading, verify that the live file identity/content matches the
approved artifact. Before writing the dependent script, verify that it still
targets that approved file version and repeat the form's fresh-read safeguard.
If reapproval changes the approved file content, repeat the guarded upload
and verify it before writing the script. Do not skip that upload merely
because an earlier version was already uploaded, and do not reupload when
the verified approved content is unchanged.

These operations are not a transaction. If the file upload succeeds but the
script update fails, report the partial state. Resume from verified live
state with the safeguards above; do not replay the whole workflow, silently
roll back another editor's changes, or claim all artifacts were published.

## References

- [Builder approval workflow](../SKILL.md#score-and-advice-at-every-design-confirmation)
- [Fulcrum Forms API](https://docs.fulcrumapp.com/reference/forms-intro)
- [Fulcrum developer documentation](https://docs.fulcrumapp.com/)
