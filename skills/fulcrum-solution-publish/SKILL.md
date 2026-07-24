---
name: fulcrum-solution-publish
description: Guide a Fulcrum builder through documenting a completed solution for Product Management review, then publish a one-pager to the #product Slack channel. Use when a builder says things like "I built something and want PM to review it", "I created a solution for a customer", "I vibe coded something and need to document it", "help me write up what I built", "I need to document my work for PM", or "how do I get my build promoted."
---

# Fulcrum Solution Publish

Guide a Fulcrum builder through documenting what they've built so Product Management can make a categorization and promotion decision — then publish the one-pager to `#product` in Slack.

Builders are typically non-engineers from Professional Services, Customer Success, or partner orgs — they build app extensions, workflows, integrations, reports, or other solutions on the Fulcrum platform, often with AI assistance.

## Goal

Walk the builder through a short conversation, produce a clean one-pager, and post it to `#product` so PM can categorize and decide whether to promote the work.

PM needs to answer:
1. **Categorize**: Tribe-owned, PS utility, customer-specific, or not promoted?
2. **Promote**: Does this scale beyond the original use case?

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

## Publish to #product

After saving the file, post the one-pager to `#product` (channel ID: `CBBAV1SH3`) using the Slack MCP `slack_send_message` tool. If the Slack MCP is not available, output the formatted message below so the builder can copy and paste it into `#product` manually.

Format the Slack message as follows — concise enough to read in Slack, enough detail for PM to triage:

```
🔨 *New Builder One-Pager: [Solution Name]*

*Submitted by:* [Builder name]
*Problem:* [Problem statement — 1-2 sentences]
*What was built:* [What it does — 1-2 sentences]
*Platform dependencies:* [Fulcrum features used]
*Readiness:* [Builder's readiness assessment]
*Scale:* [Builder's breadth/utility take]

Full one-pager saved to workspace. PM review checklist is in the doc.
```

Confirm with the builder that the post went through and tell them to watch `#product` for PM follow-up.

---

## Completion Criteria

- [ ] Builder walked through all three areas conversationally
- [ ] One-pager produced with all sections filled (or explicitly marked "PM to assess")
- [ ] Problem statement synthesized — not just copied from builder's words
- [ ] File saved as `<kebab-case-solution-name>-solution.md`
- [ ] One-pager posted to `#product` (CBBAV1SH3) via Slack MCP `slack_send_message` — or formatted message output for manual posting if MCP unavailable
- [ ] Builder confirmed and knows to watch `#product` for PM follow-up
