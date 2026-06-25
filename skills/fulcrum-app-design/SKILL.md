---
name: fulcrum-app-design
description: Use when building or modifying a Fulcrum app — guides app structure, field type selection, linked apps vs single app, repeatables, and choice list design. Also use when reviewing an existing app for structural improvements.
---

A Fulcrum **app** is a mobile-first data collection form. Every design decision trades **field simplicity** against **workflow fidelity** — the goal is the simplest structure that captures what the field crew actually needs to record and what the office needs to report on.

## App Structure Decision

Before adding fields, resolve the **structural question**: one app or multiple linked apps?

### Use a single app when:
- One person completes the entire workflow in one visit
- All data belongs to a single geographic location
- The record lifecycle is simple (create → complete)
- There are fewer than ~80 fields

### Use multiple linked apps when:
- Different roles touch different parts of the workflow (inspector vs reviewer vs approver)
- The same location is visited multiple times over weeks/months
- A parent entity has many child inspections (e.g., a project site with recurring visits)
- Any single app would exceed ~80 fields
- Different records have different lifecycles or statuses

### The linked app pattern
- **Parent app:** The entity (site, asset, project, customer). Rarely edited after creation.
- **Child app(s):** The activity (inspection, visit, observation, work order). Created per event, linked to parent via Record Link field.
- **Lookup app:** Reference data shared across apps (species lists, equipment catalogs, employee rosters). Read-only from child apps via `LOADRECORDS()`.

**Anti-pattern — the monolith:** A single app with 200+ fields, multiple status fields controlling visibility, and data events managing 60+ edge cases. This is the most common failure mode. If you see it, recommend decomposition (see `fulcrum-workflow-decomposition`).

## Field Type Selection

Choose the most constrained field type that captures the data. Constrained fields produce cleaner data, better reports, and fewer errors in the field.

| Data to capture | Field type | Why not a text field |
|----------------|-----------|---------------------|
| One choice from a list | Choice (single) | Consistent values, filterable, reportable |
| Multiple choices from a list | Choice (multiple) | Same — plus prevents typos and duplicates |
| Yes/No/NA | Choice (3 options) or Yes/No | Binary fields skip unnecessary choice lists |
| A number | Numeric | Enforces numeric input, enables calculations |
| A date | Date/Time | Enables date math, sorting, filtering |
| A location | GPS / Address | Captures coordinates, enables map views |
| A photo with context | Photo + label fields | Photos without context are nearly useless in reports |
| A signature | Signature | Legal/compliance — never use a photo field for signatures |
| A barcode/QR | Barcode | Parses and stores the value, enables lookup |
| Repeating items (line items, specimens, observations) | Repeatable | NOT multiple fields — use a repeatable section |
| A reference to another record | Record Link | Enables parent-child relationships |
| A value computed from other fields | Calculation | Keeps derived data consistent |

### Field naming conventions
- Use clear, descriptive labels — the field label IS the field prompt in mobile
- Avoid abbreviations unless universally understood in the domain
- Prefix related fields consistently (e.g., "Soil - Color", "Soil - Texture", "Soil - Depth")
- Data names (API keys) are auto-generated from labels — accept the defaults unless integrating with an external system that requires specific keys

## Repeatables

A **repeatable** is a nested table within a record — use it for variable-count items within a single record.

### Use a repeatable when:
- The number of items varies per record (0 to many)
- Items share the same structure (same fields per item)
- Items belong to the parent record, not to an independent entity
- Examples: photo observations, soil samples, species found, line items, crew members present

### Do not use a repeatable when:
- Items need their own lifecycle (status, assignment, history) — use a linked child app
- Items exceed ~20 per record regularly — performance degrades on mobile
- Items need to be queried independently — repeatables are nested, not top-level

### Repeatable design rules
- Keep repeatables focused — 5-10 fields per repeatable item is ideal
- Always include a label/title field as the first field — it appears in the collapsed repeatable list
- Photos inside repeatables are powerful — each observation gets its own photos
- Avoid nesting calculations that reference fields outside the repeatable — use record-level calculations instead

## Choice Lists

### Design principles
- **Mutually exclusive:** Each option should be clearly distinct — no overlapping meanings
- **Exhaustive:** Include an "Other" option with a conditional text field when the list might not cover all cases
- **Ordered logically:** Alphabetical for long lists, frequency-of-use for short lists, severity/chronological when order matters
- **Consistent casing:** Title Case for short labels, Sentence case for longer descriptions

### When to use a shared choice list vs inline
- **Shared (managed choice list):** When the same options appear in multiple apps or will be updated centrally (e.g., employee names, equipment types, project phases)
- **Inline (per-field):** When options are specific to one field and won't change (e.g., "Pass / Fail / NA")

## Completion Criteria

The app design is complete when:
- [ ] Every field has the most constrained type that captures the data
- [ ] The structural question (single vs linked apps) is explicitly decided and documented
- [ ] No field group exceeds 80 fields without a clear justification
- [ ] Repeatables are used for variable-count items, not duplicated field groups
- [ ] Choice lists are mutually exclusive and exhaustive
- [ ] The app has a clear goal (see `fulcrum-app-goal`)
- [ ] Required fields are set for data that must be captured — but sparingly (over-requiring frustrates field crews)
