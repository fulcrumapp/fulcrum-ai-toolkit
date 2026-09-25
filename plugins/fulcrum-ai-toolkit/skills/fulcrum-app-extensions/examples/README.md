# App Extension Examples Index

Reference artifacts for the Fulcrum extension bridge. Each file carries a
native `Source:` comment naming its public documentation. Prefer the artifacts
returned by `fulcrum_extensions_generate` when App MCP is registered; use these
to review a generated artifact or to work without a connector.

Before proposing an upload or attachment, follow the
[canonical publishing sequence](../assets/app-mcp-extension-publish-sequence.txt)
or [manual UI workflow](../SKILL.md#manual-ui-fallback). The manual workflow
is preparation and handoff only; it does not authorize either live write.
Review and approve the page, complete script, and dependencies before handoff
or either live write; fresh-read and reconcile the current script immediately
before updating it.

## Extension page

| File | What it shows |
| --- | --- |
| [`species-picker.html`](species-picker.html) | A self-contained picker page with the current public inline bootstrap, styles, and picker script. Upload it under this exact name; the triggers open `attachment://species-picker.html`. |
| [`extension-load-payload.js`](extension-load-payload.js) | Reading the `OPENEXTENSION` payload through `Fulcrum.load(({ data }) => ...)`. |
| [`extension-bootstrap-lifecycle.js`](extension-bootstrap-lifecycle.js) | The load/finish lifecycle and safe message handling. |

## Data Event triggers

| File | What it shows |
| --- | --- |
| [`open-extension-pass-values.js`](open-extension-pass-values.js) | The canonical object-form `OPENEXTENSION` call with `onMessage` write-back. |
| [`open-species-picker.js`](open-species-picker.js) | The picker pattern's trigger, storing into a TextField or RecordLinkField. |
| [`open-extension-editor.js`](open-extension-editor.js) | A minimal editor-pattern trigger. |

## Assets

| File | What it holds |
| --- | --- |
| [`app-mcp-extension-publish-sequence.txt`](../assets/app-mcp-extension-publish-sequence.txt) | Canonical review/approval and publishing sequence with a final fresh read before updating the script. |
| [`cdn-version-pinning.html`](../assets/cdn-version-pinning.html) | Unpinned versus pinned external script references. |

## Safety notes

- The bridge is the only trusted channel between the page and the record. Do
  not add ad hoc `window.postMessage` listeners; if another frame is embedded,
  verify `event.origin` and `event.source` before trusting a message.
- Treat `payload.data` as untrusted input and validate it before use.
- Never place a credential in extension source. Extensions are readable by
  anyone who can open the Reference File.
- Any external asset is a supply-chain and offline risk. Inline what an offline
  workflow needs, and pin an exact semver version otherwise.
