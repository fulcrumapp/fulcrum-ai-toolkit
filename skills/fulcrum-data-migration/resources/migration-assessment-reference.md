# Migration Assessment Reference

## Inventory

For each object type, capture source count, target capability, extraction path,
load path, stable key, dependencies, transformations, validation, rollback, and
owner.

Review at least:

- forms, versions, fields, choice values, classifications, and record statuses;
- records, repeatables, links, projects, assignments, geometry, and history;
- photos, videos, audio, signatures, sketches, attachments, and reference
  files;
- memberships, roles, groups, app/project/layer access, SSO/SCIM, and tokens;
- layers, reports, webhooks, Workflows, URLs, exports, and external system IDs.

This checklist defines discovery scope, not a claim that every item can be
migrated through one interface.

> Source: [Fulcrum public OpenAPI](https://raw.githubusercontent.com/fulcrumapp/api/v2/reference/rest-api.json)
> provides the current public API inventory; [Query API](https://docs.fulcrumapp.com/reference/query-intro)
> provides read-only discovery for documented queryable data.

## High-Risk Mappings

| Risk | Required decision/evidence |
| --- | --- |
| IDs and keys | Which identifiers can be preserved, which are regenerated, and which business key reconnects references |
| History and attribution | What the public API can read/write, what must be archived separately, and what cannot be represented |
| Timestamps | Server versus client meaning, UTC normalization, write support, precision, and comparison rule |
| Media | Supported media APIs, upload/link sequence, content type, checksum, missing file policy, and URL lifetime |
| Record links and repeatables | Dependency order, nested cardinality, unresolved-reference policy, and post-load integrity checks |
| Members and assignments | Source-to-target identity mapping, missing user policy, reassignment, role/access validation, and token ownership |
| URLs and integrations | Regional API base, record links, layer/report URLs, webhook endpoints, callbacks, and external IDs |
| Side effects | Whether loads trigger Workflows/webhooks and how duplicate downstream actions are prevented |

> Source: [Records API](https://docs.fulcrumapp.com/reference/records-intro),
> [record history](https://docs.fulcrumapp.com/reference/records-get-history),
> [timestamps](https://docs.fulcrumapp.com/reference/rest-api-timestamps), and
> [working with other instances](https://docs.fulcrumapp.com/reference/working-with-other-instances).

## Dry-Run Evidence

- immutable input snapshot and transformation version;
- per-object attempted/succeeded/rejected counts;
- deterministic source-to-target mapping ledger;
- errors with retry disposition;
- record/repeatable/link samples;
- geometry comparisons;
- media checksums and association checks;
- history/timestamp/attribution exceptions;
- effective access checks with test personas;
- integration side-effect checks;
- explicit go/no-go and rollback criteria.

## References

- [Photos API](https://docs.fulcrumapp.com/reference/photos-intro)
- [Audio API](https://docs.fulcrumapp.com/reference/audio-intro)
- [Signatures API](https://docs.fulcrumapp.com/reference/signatures-intro)
- [Memberships API](https://docs.fulcrumapp.com/reference/memberships-intro)
