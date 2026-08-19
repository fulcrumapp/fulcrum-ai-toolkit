---
name: fulcrum-solution-document
description: "Guide a Fulcrum builder through documenting a completed app, extension, workflow, report, or integration. Produce a reusable one-pager, review it for privacy and audience suitability, and prepare optional share formats for a destination chosen by the user. Use when someone wants to explain, review, hand off, or share what they built."
disable-model-invocation: true
---

# Fulcrum Solution Document

Guide a Fulcrum builder through documenting what they've built as a reusable, reviewable one-pager. Help them prepare an appropriate share format and destination, but do not publish automatically.

Builders are typically non-engineers from Professional Services, Customer Success, or partner orgs — they build app extensions, workflows, integrations, reports, or other solutions on the Fulcrum platform, often with AI assistance.

## Goal

Walk the builder through a short conversation and produce a clean one-pager that can be reviewed, handed off, or shared with the audience the builder chooses.

The intended reviewer may need to answer:
1. **Categorize**: Is this reusable, customer-specific, experimental, or ready for ownership?
2. **Decide next steps**: Does it need testing, hardening, handoff, or broader promotion?

## How to Run the Session

Ask the builder to describe what they built in a sentence or two. Then work through the three areas below.

**Have a natural conversation, not a form.** Don't read questions mechanically. If one answer makes another obvious, skip ahead. If an answer is thin, probe. The goal is to understand what they built well enough to write a useful one-pager.

If the builder says "I don't know" — capture it and flag it for PM to assess.

---

### Area 1: Problem Framing

Builders often skip straight to the solution. Slow them down here — this is the most important section.

- **Who has this problem?** A particular customer, a segment, an internal team?
- **What are they doing today without this?** Manual process, workaround, just not doing it?
- **How does this impact the customer?** Time saved, data quality, workflow unblocked, reduced errors?
- **What's the Fulcrum business impact?** Revenue, churn prevention, new use case — fine if the builder isn't sure
- **Why did you build this rather than waiting for engineering?** Urgency, customer relationship, opportunity to prototype?

### Area 2: What They Built

Document the solution without needing technical depth.

- **What does it do?** 1-2 plain-English sentences a non-technical person could understand
- **What doesn't it do, or where does it break?** Limitations, edge cases, fragile areas
- **What Fulcrum platform features does it rely on?** App extensions, Query API, webhooks, data events, reporting engine, etc.
- **How would this be delivered to a customer?** Plugin, manual config, workflow handoff
- **Is it ready to use as-is?** If not, what would "done" look like?

### Area 3: Scale Gut-Check

Builder's honest take on breadth. PM validates later.

- **One customer's situation, or a problem multiple customers would have?**
- **Could this be a shared utility, or too customized to this context?**

---

## Output — the one-pager

Once you have enough context, produce the one-pager. Save it as `<kebab-case-solution-name>-solution.md` in the current workspace.

```markdown
# [Solution Name] — Fulcrum Builder One-Pager

**Submitted by:** [Builder name]
**Date:** [Today's date]
**Status:** Awaiting PM Categorization

---

## Problem

**Who has it:** [Who specifically — customer name, segment, internal team]
**Current workaround:** [What they do today without this solution]
**Customer impact:** [Time saved, data quality, workflow unblocked, etc.]
**Fulcrum business impact:** [Revenue, churn prevention, new use case — or "PM to assess"]
**Why the builder took it on:** [Why not wait for engineering]

**Problem statement:** [1-2 sentence synthesis: "[Who] struggle with [what] because [why], which results in [impact]."]

---

## What Was Built

**What it does:** [1-2 plain-English sentences]
**Limitations:** [What it doesn't do / where it breaks]
**Platform dependencies:** [Fulcrum features it relies on]
**Delivery mechanism:** [How it reaches the customer — or "Needs guidance from PM/engineering"]
**Readiness:** [Builder's assessment + what "done" would look like]

---

## Scale Assessment (Builder's Take)

**Breadth:** [One customer / multiple customers / broadly applicable]
**Utility potential:** [Could be a shared utility / Too custom for now / Unsure — PM to assess]

---

## PM Review

*For Product Management to complete.*

- [ ] Categorization: Tribe-owned / PS utility / Customer-specific / Demote
- [ ] Scale validated
- [ ] Ownership assigned
- [ ] Signal check complete
```

---

## Prepare For Sharing

After saving the file, ask who should receive it and what format they need. Offer one or more of these destinations:

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

For a chat or email summary, use a concise format such as:

```
🔨 *New Builder One-Pager: [Solution Name]*

*Submitted by:* [Builder name]
*Problem:* [Problem statement — 1-2 sentences]
*What was built:* [What it does — 1-2 sentences]
*Platform dependencies:* [Fulcrum features used]
*Readiness:* [Builder's readiness assessment]
*Scale:* [Builder's breadth/utility take]

Full one-pager saved to workspace. Review checklist is in the document.
```

After a connector send, report the destination and result. After a manual handoff, tell the builder exactly what to copy or attach and what follow-up to expect.

---

## Completion Criteria

- [ ] Builder walked through all three areas conversationally
- [ ] One-pager produced with all sections filled (or explicitly marked "PM to assess")
- [ ] Problem statement synthesized — not just copied from builder's words
- [ ] File saved as `<kebab-case-solution-name>-solution.md`
- [ ] Intended audience and sharing destination confirmed
- [ ] Privacy review completed and redactions approved
- [ ] Selected share format prepared for the destination
- [ ] External send explicitly approved before using a configured connector
- [ ] Builder knows what was shared, where it went, or what to copy manually
