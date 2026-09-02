---
name: fulcrum-safety
description: Use when building or reviewing a Fulcrum app for field work — flags missing safety steps, ensures safety documentation is included in workflows that involve physical hazards, and recommends safety-related fields when appropriate.
---

Field data collection happens in the real world — construction sites, wetlands, roadsides, utility corridors, confined spaces, active traffic. An app that sends people into the field without prompting for safety is an app that normalizes skipping safety.

This skill does not replace a customer's safety program. It **flags gaps** where an app handles a physical field process but includes no safety acknowledgment, hazard assessment, or PPE documentation.

## When Safety Fields Apply

Flag the need for safety documentation when the app involves any of these:

- **Construction or demolition sites** — fall hazards, heavy equipment, excavation
- **Utility infrastructure** — electrical, gas, water, telecom — energized equipment, confined spaces
- **Roadside or traffic-adjacent work** — traffic control plans, vehicle positioning
- **Environmental fieldwork** — remote locations, water crossings, wildlife, heat/cold exposure, poisonous plants
- **Heights or elevated work** — towers, poles, rooftops, scaffolding
- **Hazardous materials** — chemicals, asbestos, lead, contaminated soil/water
- **Confined spaces** — vaults, tanks, manholes, tunnels
- **Work requiring PPE** — hard hats, safety vests, respirators, arc flash gear

## Recommended Safety Fields

When a safety gap is identified, recommend adding a **safety section** at the beginning of the app (before the work begins, not after):

### Minimum safety section
| Field | Type | Purpose |
|-------|------|---------|
| Job Safety Briefing Completed | Yes/No (required) | Confirms crew discussed hazards before starting |
| Site Hazards Identified | Choice (multiple) | Checklist of common hazards for this work type |
| PPE Worn | Choice (multiple) | Documents protective equipment in use |
| Safety Photo | Photo | Visual record of site conditions, PPE compliance |

### Enhanced safety section (for higher-risk work)
| Field | Type | Purpose |
|-------|------|---------|
| Tailgate Safety Topic | Text | Specific topic covered in pre-work briefing |
| Emergency Contact / Muster Point | Text | Site-specific emergency information |
| Permit Required | Yes/No | Triggers conditional section for confined space, hot work, etc. |
| Permit Number | Text (conditional) | Links to external permit system |
| Stop Work Authority Acknowledged | Yes/No | Confirms every crew member can stop work for safety |
| Near Miss / Incident | Yes/No | Triggers conditional incident documentation |
| Incident Description | Text (conditional) | Narrative of what happened |
| Incident Photos | Photo (conditional) | Visual documentation of incident |

## How to Flag

When reviewing an app that involves field work with physical hazards but has no safety section:

> "This app sends field crews to [work type]. There's no safety section — no pre-work hazard check, no PPE documentation, no incident capture. For most field organizations, a safety briefing section at the top of the app is standard practice. Should we add one?"

Do not silently add safety fields without discussing with the builder. Safety requirements vary by organization, regulatory environment, and risk tolerance. **Flag the gap and recommend — don't prescribe.**

## Anti-patterns

- **Safety section at the end of the app** — By the time the field worker reaches it, the work is done. Safety goes at the top.
- **Safety as a separate app when it should be inline** — If every inspection starts with a safety check, embed it in the inspection app. A separate safety app that nobody opens before starting work is worse than useless — it creates a false record.
- **Over-requiring safety fields on low-risk apps** — An office-based data entry app doesn't need a PPE checklist. Apply judgment.

## Completion Criteria

- [ ] Apps involving physical field hazards have been flagged if no safety section exists
- [ ] Safety section is positioned at the beginning of the app, before work fields
- [ ] Safety fields match the risk level of the work (don't over-prescribe for low-risk work)
- [ ] The builder has confirmed whether their organization requires safety documentation

## References

- [Fulcrum developer documentation](https://docs.fulcrumapp.com/)
- [OSHA safety and health topics](https://www.osha.gov/topics)
- [Agent Skills specification](https://agentskills.io/specification)
