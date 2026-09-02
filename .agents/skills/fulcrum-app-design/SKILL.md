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

### Predefined vs. ad hoc work — a design decision that changes everything

Before designing the linked app pattern, resolve whether field work is **predefined** or **ad hoc**:

- **Predefined:** The crew is inspecting a known set of assets this season (utility poles, permit sites, monitoring stations). Import those assets into the parent app before the crew goes out. The crew opens the app, finds their assigned record, and fills it in — no searching, no typing asset IDs.
- **Ad hoc:** The crew discovers what they need to record in the field. Use a Record Link lookup so they can find and connect to existing records dynamically.

Getting this wrong is expensive. A predefined workflow built as a lookup forces the crew to search and select at every visit — slow, error-prone, and frustrating. An ad hoc workflow built as pre-imports requires constant data management as the asset list changes.

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

### Classification Set — one path only
A Classification Set field captures a hierarchical taxonomy (e.g., CALVEG vegetation types, soil series, species classifications). The field walks the user down a decision tree.

> **Constraint: only one path can be captured per Classification Set field.** The user selects one branch of the hierarchy. If you need to capture multiple species, soil layers, or vegetation types per record, use a repeatable with a Classification Set field inside it — one item per repeatable entry.

This is non-obvious and commonly misunderstood. Don't design around it — design with it.

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
- **Date field inside a repeatable is a signal** — if a repeatable contains a date field, it often means the list could grow indefinitely over time. That's usually a sign the repeatable should be a linked child app instead, with each entry as its own record with its own lifecycle.

### Platform limits (practical reference)

| Thing | Limit | Notes |
|-------|-------|-------|
| Fields per app | 1,400 max | Practical limit is much lower — 80 fields is the design ceiling |
| Photos per record | ~100 recommended | Performance degrades on mobile above this |
| Repeatable items per record | ~100 practical | Mobile slows noticeably beyond this |
| Record Link results | ~100 before UX degrades | Large result sets are slow and hard to navigate in the picker |

These are soft limits — Fulcrum won't stop you at 101 repeatable items — but user experience and performance degrade predictably. Design below these thresholds.

## Choice Lists

### Design principles
- **Mutually exclusive:** Each option should be clearly distinct — no overlapping meanings
- **Exhaustive:** Include an "Other" option with a conditional text field when the list might not cover all cases
- **Ordered logically:** Alphabetical for long lists, frequency-of-use for short lists, severity/chronological when order matters
- **Consistent casing:** Title Case for short labels, Sentence case for longer descriptions

### Value vs. label — a critical distinction
Every choice has two parts: a **label** (what the user sees) and a **value** (what gets stored and exported). These are often the same, but they don't have to be — and the difference matters everywhere outside Fulcrum.

> **The label is display-only. The value is the data.**

- Webhook payloads contain values, not labels. An integration receiving `"status": "ntp"` needs to know that maps to "Not to Proceed."
- Data events use `CHOICEVALUE($field)` to read the stored value, not the displayed label.
- Reports and exports contain values. If your label says "Approved ✓" but your value is `"approved"`, the export contains `"approved"`.
- When the label needs to change (e.g., regulatory term update), change the label — not the value. Changing values breaks existing records and integrations.

**Rule:** Set values explicitly during choice list design. Don't accept auto-generated values from labels without reviewing them.

### When to use a shared choice list vs inline
- **Shared (managed choice list):** When the same options appear in multiple apps or will be updated centrally (e.g., employee names, equipment types, project phases)
- **Inline (per-field):** When options are specific to one field and won't change (e.g., "Pass / Fail / NA")

## App Status (Built-in)

Fulcrum apps have a **built-in status system** — do not create a custom choice field to track record status. The platform status field is configured under app settings, not as a form field.

**Built-in status provides:**
- Colour-coded status labels visible in the record list and map views
- `change-status` data event hook for automating transitions
- Role-based permission to change status (restrict who can approve/close records)
- Status filtering and reporting built into the platform

**Common statuses to configure:** Draft → In Review → Approved, or Pending → Complete → QC Complete.

> **Anti-pattern:** Adding a "Status" choice field to the form. This duplicates the platform's status system, creates a second source of truth, and misses the `change-status` event hook and permission controls. Always use app settings → Status instead.

To trigger logic when status changes, use `ON('change-status', ...)` in a data event — not a field-change handler on a custom status choice field.

## Visibility Rules vs Data Events

Fulcrum has **two ways to show/hide fields:**

| Mechanism | Where configured | When to use |
|-----------|-----------------|-------------|
| **Visibility rules** | App designer → field settings → Visibility | Simple show/hide based on another field's value. No code required. |
| **Data events (`SETHIDDEN`)** | Data event script | Complex conditions, multiple dependencies, dynamic logic, or show/hide that must respond to real-time changes in ways visibility rules can't express. |

**Use visibility rules first.** They're simpler to configure, easier for non-developers to modify, and don't add to the data event script complexity.

**Use `SETHIDDEN()` in a data event when:**
- The condition involves more than one or two fields
- The logic depends on calculated values or external data
- The visibility needs to change dynamically mid-session based on user interaction

> **Common mistake:** Implementing all field visibility with `SETHIDDEN()` data events when the app designer's visibility rules would handle it without code. Ask "can this be done with a visibility rule?" before writing a data event.

## Calculation Fields

A **calculation field** evaluates an expression to produce a derived value. The expression syntax is like Excel — it evaluates to a value directly. It is NOT a JavaScript function body.

```
// CORRECT — expression that evaluates to a value
$length * $width

// CORRECT — conditional expression
IF($status = "Complete", USERFULLNAME(), "")

// WRONG — JavaScript function syntax does not work in calculation fields
return $length * $width;   // ❌ 'return' locks the field

function calculate() {     // ❌ function declarations not valid here
  return $length * $width;
}
```

**Calculation field rules:**
- No `return` statement — the expression IS the return value
- No `function` declarations
- No `var`, `let`, or `const`
- Uses Fulcrum expression functions (`IF`, `CONCATENATE`, `FORMAT`, `USERFULLNAME`, etc.) not JavaScript methods
- References field values with `$data_name` syntax

If the logic is complex enough to need a function, use a data event with a `change` handler instead, and write the result to a text or numeric field via `SETVALUE()`.

## Completion Criteria

The app design is complete when:
- [ ] Every field has the most constrained type that captures the data
- [ ] The structural question (single vs linked apps) is explicitly decided and documented
- [ ] No field group exceeds 80 fields without a clear justification
- [ ] Repeatables are used for variable-count items, not duplicated field groups
- [ ] Choice lists are mutually exclusive and exhaustive
- [ ] The app has a clear goal (see `fulcrum-app-goal`)
- [ ] Required fields are set for data that must be captured — but sparingly (over-requiring frustrates field crews)
- [ ] Record status uses the built-in app status system, not a custom choice field
- [ ] Field visibility uses visibility rules where possible; `SETHIDDEN()` only for complex logic
- [ ] Calculation field expressions do not use `return`, `function`, `var`, `let`, or `const`

## References

- [Fulcrum developer documentation](https://docs.fulcrumapp.com/)
- [Agent Skills specification](https://agentskills.io/specification)
