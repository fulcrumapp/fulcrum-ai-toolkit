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

## Conditional Visibility — What Can Reference What

Visibility and requirement conditions cannot target arbitrary fields. The rules are enforced
server-side, and getting them wrong produces a 422 on save — or worse, a field that is
hidden forever because the rule never evaluates.

### Scope: children may look up, parents may not look down

| Source field | May target | May NOT target |
|---|---|---|
| Record level | Other record-level fields | Anything inside a repeatable |
| Inside a repeatable | Fields in the same repeatable, **and record-level fields** (ancestors), and fields in an enclosing outer repeatable | A **deeper-nested** repeatable, or a **sibling** repeatable |

> **A field inside a repeatable CAN be driven by a field on the parent record.** This is
> commonly assumed to be impossible and it is not. A repeatable row can hide or show its
> fields based on a record-level choice — e.g. UTM entry boxes inside a coordinates
> repeatable, revealed only when the record says coordinates were transcribed by hand.

Sections do **not** create a scope. Only repeatables do.

### Types that can never be a condition target

`Repeatable` · `Section` · `PhotoField` · `VideoField` · `AudioField` · `Label` ·
`AddressField` · `SignatureField` · `AttachmentField`

You cannot show a field "when a photo exists" with a condition. That needs a data event.

### Operators are restricted by target type

| Target type | Allowed operators |
|---|---|
| Record Link | `is_empty`, `is_not_empty` only |
| Choice, Classification, Yes/No, Status | `equal_to`, `not_equal_to`, `is_empty`, `is_not_empty` |
| Everything else | the above plus `contains`, `starts_with`, `greater_than`, `less_than` |

> **`equal_to` against a multi-select Choice field means "includes".** It scans the selected
> values and matches if any one of them equals the condition value. So revealing an "Other —
> please specify" text box when *one of several* ticked options is "Other" is a single
> `equal_to` condition, not something that needs `contains`.

## Record Links — Filtering and Defaults

### Filter the picker by the current record's value

A Record Link's `record_conditions` can compare a field on the **linked** app against either a
static value or **a field on the current record** (`value_field_key`). That second form is the
one worth knowing:

```
linked_form_field_key: <project field on the Site app>
operator:              equal_to
value_field_key:       <project field on this record>
```

→ "only offer me Sites belonging to this record's project."

This matters because the Record Link picker degrades past ~100 results. A firm with forty
projects and hundreds of sites needs the list narrowed, and filtering by a value already on
the record does it without any data events.

> **Ordering consequence:** the filtering field must be answered *before* the link it filters.
> If a form learned its project *from* the site it selected, there would be nothing to filter
> the site picker by. Put the broad link first, the narrow link second.

### `record_defaults` copies — it does not sync

`record_defaults` stamps values from the linked record onto the current record **at selection
time, once, one-way**. It is not a live reference.

**Use it when** the copied value is meant to be edited afterwards — seeding an authoritative
record with sensible starting values.

**Do not use it when** the value must stay correct. If the source can change after linking —
a temporary identifier replaced by a permanent one, a project renamed — every copy made
beforehand is silently stale.

**Instead:** store the link and read through it at report time. The link holds a record ID,
which never changes, so the report always sees current values. Where a copy is unavoidable
(offline display), mark those fields read-only so nobody mistakes a snapshot for live data.

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

### Coded taxonomies — put the code in the value, the wording in the label

Regulatory and scientific lists usually pair a stable code with mutable wording: `HP16` is
permanent, "Religious building" is how it happens to be phrased today. If you set both label
and value to `"HP16 Religious building"`, then correcting a typo in the wording **changes the
stored value** and orphans every existing record.

| | Label (display) | Value (stored) |
|---|---|---|
| Recommended | `HP16 Religious building` | `HP16` |
| Fragile | `HP16 Religious building` | `HP16 Religious building` |

Trade-off worth naming out loud: exports contain values, so bare codes make a spreadsheet
compact and stable but less readable. If customers analyse exports directly, either accept
that or have the report expand codes to labels.

> **Sorting:** choices render in the order you author them — Fulcrum does not sort them. But
> if customers export to Excel and sort *there*, zero-pad numeric codes (`HP01`, not `HP1`),
> or `HP10` will sort between `HP1` and `HP2`.

### Commas in choice values

A choice value containing a comma — `"Building, Structure, and Object Record"` — survives the
API fine, but is split into separate choices by any tool that accepts choices as a
comma-separated string. That includes some CLI helpers and some org-migration paths.

Always create such lists by passing an **array** of choice objects, and verify the list after
migrating an app between orgs: read it back and compare the count against the source.

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
