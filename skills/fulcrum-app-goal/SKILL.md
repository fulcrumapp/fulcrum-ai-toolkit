---
name: fulcrum-app-goal
description: Use when creating a new Fulcrum app or reviewing an existing one — ensures every app has a clear goal, a defined deliverable, and a known audience before building begins. Flag when a goal is missing or unclear.
---

Every Fulcrum app exists to produce a **deliverable** for a **specific audience**. An app without a clear goal drifts — fields accumulate, requirements conflict, and the app becomes a monolith that serves no one well.

## The Three Questions

Before building or modifying any app, answer these:

1. **What is this app for?** — One sentence. If it takes a paragraph, the app is trying to do too much.
2. **What deliverable does it produce?** — A report, a dataset, a compliance record, a work order, a notification. Name it.
3. **Who uses it, and where?** — Field crew on mobile? Office reviewer on web? Both? Different roles see different things.

### Examples of clear goals

| App | Goal | Deliverable | Audience |
|-----|------|-------------|----------|
| Wetland Delineation | Document hydrology, vegetation, and soil at sample points | USACE ENG 6116 regulatory report | Field biologist (mobile), project manager (web report) |
| Daily Safety Inspection | Record job site hazards and corrective actions | Daily safety log + email to supervisor | Foreman (mobile), safety manager (web) |
| Asset Inventory | Catalog equipment with location, condition, and photo | Filterable asset database + export to GIS | Field technician (mobile), asset manager (web export) |
| Work Order Dispatch | Assign, track, and close maintenance tasks | Completed work order with time, materials, signature | Dispatcher (web), technician (mobile) |

### Red flags — goal is missing or unclear

Flag these and ask the builder to clarify before proceeding:

- **"We need an app that captures everything about [X]"** — "Everything" is not a goal. Ask: what report or decision does this data serve?
- **Multiple unrelated data types in one app** — An app capturing both daily inspections AND equipment inventory is two apps forced into one.
- **No named deliverable** — If the builder can't name what comes out of the app, the design will drift.
- **"Just add these fields"** — Fields without purpose produce data without value. Ask: who reads this field, and what do they do with it?
- **Builder doesn't know the field process** — The person designing the app has never done the work being captured. This produces apps that make sense on screen but fail in the field. Recommend `fulcrum-discovery` to interview someone who does the work.

## Applying the Goal

Once the goal is clear, it becomes a filter for every design decision:

- **Does this field serve the deliverable?** If not, remove it or move it to a separate app.
- **Does this choice list match how field crews think about the options?** If built by an office person, test with field users.
- **Does the app structure match the workflow?** If field crews complete the work in multiple visits, the app needs a parent-child structure, not a single massive form.

## Reviewing an Existing App

When asked to review or improve an existing app, assess the goal first:

1. Read the app name and field structure
2. Infer the likely goal, deliverable, and audience
3. Present your inference to the builder: "It looks like this app is for [goal], producing [deliverable] for [audience]. Is that right?"
4. If the builder corrects you, update the goal and assess whether the current structure serves it
5. Flag any fields, sections, or complexity that don't serve the stated goal

## Completion Criteria

- [ ] The app has a one-sentence goal statement
- [ ] A specific deliverable is named (report, dataset, notification, export)
- [ ] The audience is identified (who uses it on mobile, who consumes the output)
- [ ] Every field group serves the stated goal — orphan fields are flagged
