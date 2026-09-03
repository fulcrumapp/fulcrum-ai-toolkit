---
name: fulcrum-workflow-decomposition
description: Use when a Fulcrum app has grown too complex — too many fields, too many data events, too many status paths. Guides breaking monolithic apps into composable, maintainable pieces. Also use when reviewing an app that shows signs of monolith creep.
---

A **monolith** is an app that tries to capture an entire business process in a single form. It starts simple, grows as requirements accumulate, and eventually becomes unmaintainable — hundreds of fields, dozens of visibility rules, data events managing edge cases nobody remembers creating.

The cure is **decomposition**: splitting the monolith into purpose-built apps that each own one piece of the workflow and connect through Record Links and reference data.

## Monolith Warning Signs

Flag decomposition when you see any of these:

- **Field count exceeds 100** — Mobile performance degrades, scrolling becomes painful
- **Data event script exceeds 500 lines** — Debugging becomes guessing
- **Multiple status fields controlling different workflows** in one app — The app is doing two jobs
- **Visibility rules hide 50%+ of fields** based on a role or status — Those hidden fields are a separate app trying to escape
- **Different people fill out different sections** — Inspector fills the top, reviewer fills the bottom. That's two apps.
- **The same app is duplicated across regions/teams** with slight variations — Shared structure with scoped configuration, not copies

## Decomposition Strategy

### Step 1: Identify the entities

Every workflow has entities — the nouns. Common patterns:

| Entity | Role in workflow | Fulcrum app type |
|--------|-----------------|-----------------|
| Site / Location / Asset | The thing being inspected or maintained | Parent app |
| Inspection / Visit / Observation | The activity performed at the site | Child app (linked to parent) |
| Work Order / Task | An assignment to do something | Dispatch app (linked to site) |
| Reference Data | Lookup lists shared across apps | Lookup app (read-only) |
| Report / Deliverable | The output | Report template on the child app |

### Step 2: Map the relationships

Sketch the cardinality between entities before choosing apps. A worked example
is [`assets/entity-relationship-map.txt`](assets/entity-relationship-map.txt).

Use **Record Link** fields to connect apps. The child record links to the parent — not the other way around.

### Step 3: Decide what stays together

Not everything needs to be split. Keep things in one app when:
- One person fills it out in one visit
- All fields share the same lifecycle
- Splitting would create a linked app with only 3-5 fields (overhead > value)

### Step 4: Move shared data to lookup apps

Data that appears in choice lists across multiple apps (employees, equipment, species, project sites) belongs in a **lookup app**. Field apps use `LOADRECORDS()` to query the lookup at runtime.

Benefits: one place to update, all apps see the change, no manual syncing.

### Step 5: Preserve reporting continuity

Before splitting, confirm that the deliverable (report) can still be produced. If a single report needs data from multiple apps, this is a **multi-record report** scenario — the report template must query across apps or the workflow must aggregate data before rendering.

## Real-World Decomposition Example

**Before (monolith):** One app with 350 fields. Telecom construction lifecycle — dispatch, site survey, construction, QA, close-out. Five different roles touch it. 60+ data event edge cases. Multiple status fields. Three restructuring attempts.

**After (decomposed):**

| App | Fields | Owner | Purpose |
|-----|--------|-------|---------|
| Project Sites | ~20 | Dispatcher | Site master record — location, project info, contacts |
| Site Survey | ~30 | Surveyor | Pre-construction assessment, photos, measurements |
| Construction Log | ~25 | Foreman | Daily work record — crew, equipment, progress, safety |
| QA Inspection | ~30 | Inspector | Quality checklist against construction standards |
| Close-Out | ~15 | Project Manager | Final sign-off, punch list, documentation complete |
| Equipment Catalog | ~10 | Admin | Shared lookup — equipment types, calibration dates |

Each app has its own data events (simple), its own report, and its own status lifecycle. Record Links connect everything to the Project Site.

## Handling the Transition

Decomposition of a live app is disruptive. Sequence it:

1. **Build the new apps alongside the old** — Don't delete the monolith yet
2. **Migrate historical data if needed** — Or mark a clean cutover date
3. **Train users on the new workflow** — The navigation changes (multiple apps, Record Links)
4. **Run parallel for a sprint** — Let users report friction before retiring the old app
5. **Archive the monolith** — Don't delete — some users may need historical records

## Completion Criteria

- [ ] Entities are identified and mapped to separate apps
- [ ] Relationships are defined (parent-child via Record Links)
- [ ] Shared reference data is in lookup apps, not duplicated in choice lists
- [ ] Each decomposed app has a clear goal (see `fulcrum-app-goal`)
- [ ] Data events per app are under 500 lines
- [ ] Reporting continuity is confirmed — deliverables still producible
- [ ] Transition plan exists if decomposing a live app

## References

- [Fulcrum developer documentation](https://docs.fulcrumapp.com/)
- [Decomposition template index](assets/README.md)
- [Agent Skills specification](https://agentskills.io/specification)
