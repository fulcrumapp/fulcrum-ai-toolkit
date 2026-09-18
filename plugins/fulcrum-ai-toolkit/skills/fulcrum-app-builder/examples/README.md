# App Builder Example Index

Build-orchestration artifacts. Each file carries a native `Source:` comment
naming its public documentation. Live installed App MCP schemas remain the
authority for tool arguments and response shapes.

| File | What it shows |
| --- | --- |
| [`forms-update-preserving-keys.js`](forms-update-preserving-keys.js) | Payload-only fragment showing the update shape and conditional `removed_element_keys`; not a standalone publishing workflow. |
| [`app-build-sequence.txt`](../assets/app-build-sequence.txt) | Canonical new-form workflow: build, validate, review score/performance advice, approve, then create. |

## Safety

- Before using the update fragment, follow
  [the gated update workflow](../SKILL.md#step-4-build-or-hand-off) and
  [pre-write freshness safeguard](../resources/pre-write-freshness.md).
- Preservation is the default. Copy every existing element and inline-choice
  key through unchanged, including each element's concrete field type.
- “Element” is a generic schema/model term, not a valid field type. New fields
  must use the concrete type returned by `fulcrum_schema_build_field`.
- Removing a field permanently deletes its data. Explain the impact and get
  explicit approval first.
- Never call a destructive tool on inferred intent.
