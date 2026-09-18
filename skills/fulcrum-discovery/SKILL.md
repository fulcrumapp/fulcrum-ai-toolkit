---
name: fulcrum-discovery
description: Discover requirements before building a new Fulcrum app or workflow. Use when a user starts a new build, needs help clarifying a field process, deliverable, users, or constraints, or would benefit from a structured pre-build interview.
---

**Discovery before building.** The most common failure mode in Fulcrum app building is starting with fields before understanding the workflow. This skill walks through a structured interview — one question at a time — to build a clear picture before opening the app builder.

## Invocation And Consent

This skill may be selected automatically when a user starts a new Fulcrum app
or workflow or needs pre-build requirements clarified. Automatic selection does
not authorize starting the full interview without consent. Offer the user the
same quick check-in versus full discovery choice defined by
`fulcrum-app-builder`. If that workflow already offered the choice and the user
selected full discovery, continue without asking again.

Reuse answers already provided and ask only for missing information. If the user
chooses the quick check-in or declines the full interview, return control to the
calling workflow after confirming the minimum goal, deliverable, and users.
Keep the summary in the conversation unless the user requests a saved document.
Discovery does not authorize file writes, app changes, or external sharing;
obtain approval for those actions separately.

## Platform Boundaries — Resolve Before the Interview

Before starting the interview, surface and confirm these boundaries. Mismatched expectations here derail builds more than anything else.

> **Ask:** "Before we design the app, I want to make sure Fulcrum is the right fit for what you have in mind. Let me flag a few things that sometimes surprise people."

### What Fulcrum is not

| Misconception | Reality |
|---|---|
| "Fulcrum will come pre-built for our industry" | Fulcrum is a platform. Apps are built, not purchased. PS builds them with you — they don't maintain them afterward by default. |
| "We can set up automated workflows without code" | Fulcrum's workflows are webhook-triggered HTTP calls, not a drag-and-drop automation platform. Logic lives in data events (JavaScript) or external tools like Zapier, Power Automate, or n8n. |
| "We can build dashboards and analytics inside Fulcrum" | Fulcrum is a data collection platform. Reporting is form-based PDF exports and the Query API. For BI-style dashboards, connect to an external tool (Power BI, Google Looker, Tableau). |
| "We can do what Esri does — lasso selection, custom symbology, native layer editing" | Fulcrum is not a GIS platform. The map view shows collected records. No lasso, no custom symbology, no offline FSL layer editing (web only, read limitations). |
| "This will work offline with our Esri layers" | Private ArcGIS FSL layers are not available offline. MBTiles work offline. This affects field teams in areas without connectivity. |

If any of these match what the builder has in mind, resolve it now — not after the app is half-built.

### Feature eligibility — confirm before designing

Check the capabilities the proposed workflow actually needs, such as
`LOADRECORDS()`, `LOADFILE()`, APIs, webhooks, Workflows, or SSO/SCIM. Do not
infer eligibility from a remembered plan name or a static tier matrix.

Follow the sibling
[Plan And Licensing Check](../fulcrum-product-knowledge/resources/plan-and-licensing-reference.md):
consult [current pricing](https://www.fulcrumapp.com/pricing/) and the
capability's [public documentation](https://docs.fulcrumapp.com/), and confirm
the organization's applicable plan/add-on, permissions, and configuration.
If access cannot be verified, record it as unresolved and offer a design
that does not depend on it; do not promise an entitlement or upgrade path.

> **Ask:** "Which of these capabilities does your organization currently have access to? Let's verify any dependency before we design around it."

---

## The Interview

Ask these questions **one at a time**. Wait for the answer. Let the answer shape the next question. Do not rush to the app design.

### 1. The Goal
> "What is this app for? In one sentence, what does it need to accomplish?"

Listen for: a clear deliverable, or vagueness ("capture everything about..."). If vague, probe: "What report, export, or decision does this data feed?"

### 2. The Deliverable
> "What comes out of this app? A PDF report? A data export? A notification? A compliance record?"

The deliverable shapes the entire design. A regulatory PDF report needs precise fields and formatting. A data export needs clean, consistent field types. A notification needs status triggers.

### 3. The User
> "Who uses this in the field? What device? Are they in an office, on a construction site, in a wetland? Do they have connectivity?"

Listen for: mobile vs web, offline requirements, gloves/PPE constraints (affects field types — big buttons, not text fields), literacy level, bilingual needs.

### 4. The Process
> "Walk me through what happens from start to finish. Someone shows up at the site — what do they do first? Then what? When are they done?"

This is the most important question. Let them talk. Listen for:
- **Sequence** — What order do things happen?
- **Roles** — Does one person do everything, or do different people handle different parts?
- **Revisits** — Do they come back to the same site? How often?
- **Decision points** — Where does someone make a judgment call?
- **Handoffs** — When does work pass from one person to another?
- **Exceptions** — What happens when something goes wrong?

### 5. The Data
> "What specific data points do you need to capture? Can you show me a paper form, existing report, or spreadsheet you use today?"

Existing artifacts are gold. A paper form shows exactly what they capture today. A report template shows what the deliverable looks like. An Excel tracker shows the data model.

### 6. The Context
> "Is this for one team or many? One region or multiple? Will the same app be used by different customers/sites with different requirements?"

Listen for: shared vs per-client configuration needs, regulatory variations by region, multi-language requirements.

### 7. The Safety
> "Does this work involve any physical hazards? Construction, utilities, traffic, environmental exposure, confined spaces?"

If yes, a safety section is needed (see `fulcrum-safety`).

### 8. The Constraints
> "What are your must-haves vs nice-to-haves? Is there a deadline? Any regulatory requirements that are non-negotiable?"

Constraints reveal priorities. Regulatory requirements are gates — they don't move. Internal preferences are flexible.

## After the Interview

Summarize what you learned using
[`assets/discovery-summary-template.md`](assets/discovery-summary-template.md).
It captures the app goal, deliverable, users, process, entities, relationships,
safety applicability, constraints, and the recommended structure.

Present this to the builder. Confirm before building. Then proceed with `fulcrum-app-design`.

## Completion Criteria

### Quick check-in

- [ ] Goal, deliverable, and users are confirmed
- [ ] Control is returned to the calling workflow

### Full discovery

- [ ] Platform boundaries reviewed — any misconceptions resolved before the interview
- [ ] Required feature eligibility verified against current sources and organization access, or explicitly marked unresolved with a fallback
- [ ] All 8 interview topics are covered using existing answers or requested follow-up questions
- [ ] A discovery summary is written and confirmed by the builder
- [ ] The structural recommendation (single vs linked apps) is stated
- [ ] Any existing artifacts (paper forms, reports, spreadsheets) have been reviewed

## References

- [Fulcrum developer documentation](https://docs.fulcrumapp.com/)
- [Fulcrum offline capabilities](https://docs.fulcrumapp.com/docs/offline-capabilities)
- [Discovery template index](assets/README.md)
- [Agent Skills specification](https://agentskills.io/specification)
