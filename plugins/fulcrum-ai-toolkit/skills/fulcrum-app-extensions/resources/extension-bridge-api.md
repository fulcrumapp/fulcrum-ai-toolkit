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
string is not the supported contract.

```javascript
ON('click', 'open_editor', function() {
  OPENEXTENSION({
    url: 'attachment://my-extension.html',
    title: 'My Extension',
    data: {
      current_value: VALUE('target_field')
    },
    onMessage: function(message) {
      var data = message && message.data;
      if (data) {
        SETVALUE('target_field', data.value);
      }
    }
  });
});
```

For HTML uploaded as a Reference File, use exactly
`attachment://<filename>.html`. External HTTPS pages require connectivity.

## Generated Bootstrap And Payload

The HTML returned by `fulcrum_extensions_generate` embeds the current Fulcrum
bootstrap inline. Keep that generated script intact so the Reference File
remains standalone and offline-capable. Do not replace it with an old hosted
script.

Code after the generated bootstrap receives the options object's `data` value
through `payload.data`:

```javascript
Fulcrum.load(function(payload) {
  initialize(payload.data || {});
});

function initialize(data) {
  // Populate the extension UI from data.
}

function saveAndClose(result) {
  Fulcrum.finish(result);
}
```

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

The layer-2 Reference File tool subset exposes list, get, and upload operations;
it does not define a delete tool. Do not invent a delete call: use the upload
workflow according to the registered service contract for replacement, and use
the supported product UI or manual flow when removal is required. Keep the
filename synchronized with the `attachment://` URL.

## Sandbox Constraints

- Extensions cannot save files or generated media directly to the device.
- API calls and dynamically fetched assets require connectivity even when the
  HTML is a Reference File.
- Extension state is not persistent unless it is written back to a form field
  and passed in again.
- Keep offline-required CSS and JavaScript in the generated HTML or other
  Reference Files.

## Field Pattern

- Use a HyperlinkField as the extension trigger.
- Use a TextField for a free-form picker result or a RecordLinkField for a
  selected Fulcrum record.
- Trigger the extension with `ON('click', 'field_data_name', ...)`.
- Keep the result in ordinary Fulcrum fields so it syncs normally.
