---
name: fulcrum-solution-document
description: "User-invoked workflow to document a completed Fulcrum app, extension, workflow, report, or integration. Produce an audience-appropriate one-pager, review it for privacy, and prepare optional share formats for a destination chosen by the user. Run only when someone requests documentation, review, handoff, or sharing."
disable-model-invocation: true
---

# Fulcrum Solution Document

Guide a Fulcrum builder through documenting what they've built as a reusable, reviewable one-pager. Help them prepare an appropriate share format and destination, but do not publish automatically.

Builders may be customers, partners, independent builders, or internal teams,
with any level of technical experience. Adapt the document to their chosen
audience and ownership model; an internal product review is not a prerequisite.

## Invocation And Consent

This is a manual workflow, even in hosts that ignore `disable-model-invocation`.
Do not launch an interview or create, save, overwrite, or share a document
merely because an app was built or another skill ran. Obtain the user's
request for the action first. Use existing context and ask only for missing
information needed for the requested document or review. A request to draft
does not authorize saving a file or sending it externally.
For a review-only request, return findings without creating a new document
unless asked.

## Goal

Walk the builder through a short conversation and produce a clean one-pager that can be reviewed, handed off, or shared with the audience the builder chooses.

The intended reader should be able to answer:
1. **Understand the scope**: Who is this for, what does it do, and what are its limitations?
2. **Assess readiness**: What has been tested, and what remains unverified?
3. **Plan the handoff**: Who owns it, what support is available, and what happens next?

## How to Run the Session

Confirm the intended audience and requested output. Ask the builder to
describe what they built in a sentence or two if that context is missing.
Then cover the three areas below.

**Have a natural conversation, not a form.** Don't read questions mechanically. If one answer makes another obvious, skip ahead. If an answer is thin, probe. The goal is to understand what they built well enough to write a useful one-pager.

If the builder says "I don't know", record it as "Unconfirmed" and identify
who can verify it, if known. Do not invent an owner or a readiness claim.

---

### Area 1: Problem Framing

Builders often skip straight to the solution. Slow them down here — this is the most important section.

- **Who has this problem?** A field team, customer, partner, or other intended user?
- **What are they doing today without this?** Manual process, workaround, just not doing it?
- **How does this impact the customer?** Time saved, data quality, workflow unblocked, reduced errors?
- **What outcome matters to this audience?** A faster workflow, reliable deliverable, improved accessibility, or another agreed measure?
- **What constraints shaped the solution?** Timeline, connectivity, devices, compliance, or available tools?

### Area 2: What They Built

Document the solution without needing technical depth.

- **What does it do?** 1-2 plain-English sentences a non-technical person could understand
- **What doesn't it do, or where does it break?** Limitations, edge cases, fragile areas
- **What Fulcrum platform features does it rely on?** App extensions, Query API, webhooks, data events, reporting engine, etc.
- **How will the intended users receive and use it?** App access, manual configuration, plugin, or workflow handoff
- **Is it ready to use as-is?** What has actually been tested, and what would "done" look like?

### Area 3: Reuse, Ownership, And Handoff

Record the builder's assessment without presenting it as verified evidence.

- **Is this specific to one team or reusable elsewhere?** What would need to change?
- **Who owns configuration, maintenance, and support?** Note any proposed owner whose acceptance is still unconfirmed.
- **What does the recipient need for a successful handoff?** Access, setup instructions, testing, training, or a named next action?

**Optional internal product intake:** Only if explicitly requested for an
internal audience, add that team's product-review questions or business
assessment. Omit this from customer, partner, and independent-builder
documents unless requested; it is not a required approval or categorization step.

---

## Output — the one-pager

Once the user has requested a document and you have enough context, draft the
one-pager in the conversation. If the user requests a workspace file, confirm
the filename and location, using `<kebab-case-solution-name>-solution.md` as
the default. Do not overwrite an existing file without approval.

Use [`assets/solution-one-pager-template.md`](assets/solution-one-pager-template.md)
as the structure. It covers the audience, problem framing, what was built,
readiness evidence, reuse, ownership, and handoff. Omit the optional internal
intake section unless requested.

---

## Prepare For Sharing

Sharing is optional. If the user wants to share the document, confirm who
should receive it and what format they need. Offer suitable options:

- Save the Markdown one-pager in the workspace.
- Produce a concise message for copy-and-paste into Slack, Teams, email, or chat.
- Draft a GitHub issue, Discussion, or pull request description.
- Produce a sanitized public or customer-safe version.
- Create a share bundle containing the Markdown document, short summary, and optional structured metadata.

Only use a Slack, Teams, email, GitHub, or other connector when it is configured in the current environment. Before any external send, complete all of these steps:

1. Show the final draft and intended audience.
2. Review customer names, screenshots, business impact, implementation details, credentials, and other sensitive information.
3. Ask the builder to approve the content, redact anything necessary, and confirm the destination.
4. Send only after explicit approval.

If no connector is available, provide the selected share format for manual copying or attachment. Never imply that a message was sent when the connector is unavailable.

For a chat or email summary, use the concise format in
[`assets/solution-share-summary.txt`](assets/solution-share-summary.txt).

After a connector send, report the destination and result. After a manual handoff, tell the builder exactly what to copy or attach and what follow-up to expect.

---

## Completion Criteria

- [ ] User requested the workflow; existing context or follow-up answers cover the three areas
- [ ] One-pager produced for the chosen audience, with gaps marked "Unconfirmed" and optional internal intake omitted unless requested
- [ ] Problem statement synthesized — not just copied from builder's words
- [ ] Readiness evidence, ownership status, and next handoff actions are explicit
- [ ] Output provided in the requested format; a file is saved only when requested, at the agreed path
- [ ] If sharing is requested, the audience and destination are confirmed, privacy review and approved redactions are complete, and the selected format is prepared
- [ ] Any external send is explicitly approved before using a configured connector
- [ ] Builder knows what was produced, whether anything was shared, and any next action

## References

- [Fulcrum developer documentation](https://docs.fulcrumapp.com/)
- [Document template index](assets/README.md)
- [Agent Skills specification](https://agentskills.io/specification)
