# App Builder Example Index

Build-orchestration artifacts. Each file carries a native `Source:` comment
naming its public documentation. Live installed App MCP schemas remain the
authority for tool arguments and response shapes.

| File | What it shows |
| --- | --- |
| [`forms-update-preserving-keys.js`](forms-update-preserving-keys.js) | The preservation-safe `fulcrum_forms_update` call with `removed_element_keys`. |
| [`app-build-sequence.txt`](../assets/app-build-sequence.txt) | The ordered new-form build: field types, field builder, form builder, create, validate. |

## Safety

- Preservation is the default. Copy every existing element and inline-choice
  key through unchanged.
- Removing a field permanently deletes its data. Explain the impact and get
  explicit approval first.
- Never call a destructive tool on inferred intent.
