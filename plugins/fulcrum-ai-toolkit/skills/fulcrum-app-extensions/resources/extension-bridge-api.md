# App Extension Bridge API Reference

> Source: https://docs.fulcrumapp.com/docs/app-extensions-introduction.md
> Connector authority: Live installed App MCP schemas define connector
> arguments. Bridge behavior is sourced from the public references below.
> Verified: 2026-09-02

## Authoritative Generation Path

When App MCP is registered, use `fulcrum_extensions_list_patterns`,
`fulcrum_extensions_explain`, and `fulcrum_extensions_generate`. The generator
returns the Data Event, complete HTML with the current inline bootstrap, and
setup notes. Do not reconstruct those artifacts from this fallback reference.

## OPENEXTENSION()

Call `OPENEXTENSION` from a HyperlinkField `click` handler with an options object
containing `url`, `title`, `data`, and `onMessage`. A bare filename or positional
string is not the supported contract. See
[`open-extension-editor.js`](../examples/open-extension-editor.js) for a minimal
trigger and [`open-extension-pass-values.js`](../examples/open-extension-pass-values.js)
for the canonical version with record context.

For HTML uploaded as a Reference File, use exactly
`attachment://<filename>.html`. External HTTPS pages require connectivity.

## Generated Bootstrap And Payload

The HTML returned by `fulcrum_extensions_generate` embeds the current Fulcrum
bootstrap inline. Keep that generated script intact so the Reference File
remains standalone and offline-capable. Do not replace it with an old hosted
script.

Code after the generated bootstrap receives the options object's `data` value
through `payload.data`. See
[`extension-bootstrap-lifecycle.js`](../examples/extension-bootstrap-lifecycle.js)
for the load/finish lifecycle and
[`extension-load-payload.js`](../examples/extension-load-payload.js) for reading
individual values. A complete page is
[`species-picker-extension.html`](../examples/species-picker-extension.html).

`Fulcrum.finish(result)` closes the extension and delivers `{ data: result }` to
the Data Event's `onMessage` callback. It does not write form fields
automatically; the callback must call `SETVALUE()` or another supported Data
Event function.

## Reference File Workflow

1. Generate artifacts with `fulcrum_extensions_generate`.
2. Upload the generated HTML with
   `fulcrum_reference_files_upload({ form_id, file_name, content })`.
3. Read the form's existing `script` with `fulcrum_forms_get`.
4. Append or merge the generated Data Event without replacing unrelated
   handlers.
5. Write the complete script with `fulcrum_forms_update`.

Replacing a Reference File requires a deliberate delete and upload through the
registered Reference File tools. Confirm the destructive delete first and keep
the filename synchronized with the `attachment://` URL. The full ordered
sequence is in
[`app-mcp-extension-publish-sequence.txt`](../assets/app-mcp-extension-publish-sequence.txt).

## Sandbox Constraints

- Extensions cannot save files or generated media directly to the device.
- API calls and dynamically fetched assets require connectivity even when the
  HTML is a Reference File.
- Extension state is not persistent unless it is written back to a form field
  and passed in again.
- Keep offline-required CSS and JavaScript in the generated HTML or other
  Reference Files. Any external reference is both an offline and a
  supply-chain risk; pin an exact semver version when one is unavoidable, as in
  [`cdn-version-pinning.html`](../assets/cdn-version-pinning.html).
- The Fulcrum bridge is the only trusted channel. Do not add ad hoc
  `window.postMessage` listeners, and verify `event.origin` and `event.source`
  before trusting a message from any other embedded frame.
- Never embed a credential; extension source is readable by anyone who can open
  the Reference File.

## Field Pattern

- Use a HyperlinkField as the extension trigger.
- Use a TextField for a free-form picker result or a RecordLinkField for a
  selected Fulcrum record.
- Trigger the extension with `ON('click', 'field_data_name', ...)`.
- Keep the result in ordinary Fulcrum fields so it syncs normally.
