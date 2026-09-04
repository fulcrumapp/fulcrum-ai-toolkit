# App Extension Bridge API Reference

> Source: Fulcrum developer documentation
> Fetched: 2026-08-19

## Overview

App extensions are custom HTML/CSS/JavaScript UIs embedded inside a Fulcrum record via an iframe. They communicate with the host app through a postMessage bridge.

## OPENEXTENSION()

Called from a Data Event to open an extension. **MUST be an object — a bare string is a silent no-op.**

```javascript
// CORRECT — object with url, title, and onMessage callback
ON('click', 'open_editor', function(event) {
  OPENEXTENSION({
    url: 'attachment://my-extension.html',
    title: 'My Extension',
    onMessage: function(message) {
      // message contains data returned by Fulcrum.finish() in the extension
      if (message && message.type === 'result') {
        SETVALUE('target_field', message.data.value);
      }
    }
  });
});

// WRONG — bare string. Silent no-op, no error, button does nothing.
// OPENEXTENSION('my-extension.html');  // DO NOT DO THIS
```

### Critical: `attachment://` scheme

Uploaded reference files (HTML extensions) MUST use the `attachment://` prefix:
- **Correct:** `url: 'attachment://my-extension.html'`
- **Wrong:** `url: 'my-extension.html'` (silent failure)
- **Wrong:** `url: 'attachments://my-extension.html'` (plural — silent failure)

### Critical: Bootstrap script required

Every extension HTML file MUST include Fulcrum's bootstrap script in `<head>`. Without it, `Fulcrum.load` and `Fulcrum.finish` are `undefined` and nothing works — no error, just silent failure.

```html
<!DOCTYPE html>
<html>
<head>
  <script src="https://fulcrumapp.com/js/fulcrum-extension.js"></script>
</head>
<body>
  <script>
    // Fulcrum.load() is called when the extension is ready
    Fulcrum.load(function(data) {
      // data.args contains any arguments passed from OPENEXTENSION
      // Build your custom UI here
    });

    // Call Fulcrum.finish() to return data to the form
    function saveAndClose(result) {
      Fulcrum.finish({ value: result });
      // This sends data to the onMessage callback in the Data Event
      // The Data Event then calls SETVALUE() to write to form fields
    }
  </script>
</body>
</html>
```

### Data flow: Extension → Form

1. Data Event calls `OPENEXTENSION({ url, onMessage })`
2. Extension HTML loads, calls `Fulcrum.load(callback)` to initialize
3. User interacts with the extension UI
4. Extension calls `Fulcrum.finish(data)` to return results
5. `onMessage` callback in the Data Event receives the data
6. Data Event calls `SETVALUE()` to write values to form fields

**`Fulcrum.finish()` does NOT automatically write to fields** — you must explicitly call `SETVALUE()` in the `onMessage` handler.

## Bridge Communication

Extensions communicate with Fulcrum via the bootstrap script API:

### Extension → Host
- `Fulcrum.finish(data)` — return results and close the extension
- `Fulcrum.cancel()` — close without returning data

### Host → Extension
- `Fulcrum.load(callback)` — receives initial context (record data, form schema, args from OPENEXTENSION)

### Legacy postMessage API (lower level)
- `window.parent.postMessage({type: 'result', value: data}, '*')` — return data
- `window.parent.postMessage({type: 'close'}, '*')` — close extension
- Extensions receive messages via `window.addEventListener('message', handler)`

Use the `Fulcrum.load/finish` API — it's simpler and handles the postMessage protocol for you.

## Sandbox Constraints

- Extensions run in a sandboxed iframe
- No direct DOM access to the parent Fulcrum app
- `window.print()` and direct PDF download are blocked
- Extensions must be self-contained (inline CSS/JS or bundled)
- Network requests from extensions are subject to CORS
- Extensions should work offline when possible (bundle all dependencies)
- There is no "update a reference file" API — replacing an extension requires delete + re-upload

## Extension Field Properties

In the form schema, an extension field has:
- type: "HyperlinkField" with display.style set to "button"
- The extension HTML is uploaded as a reference file (attachment)
- The Data Event triggers on `click` of the hyperlink field

## Common Patterns

1. **Picker/Selector**: Open extension, user selects from custom UI, return selection to form field
2. **Calculator**: Complex calculations with custom UI, return computed values
3. **Visualization**: Display data in charts/maps/diagrams within the record
4. **Data Entry**: Custom input interfaces (drawing tools, schematic builders, etc.)

## Anti-Pattern: The Picker Trap

Don't build an extension just to replicate what a choice field or record link can do. Extensions add complexity (offline support, maintenance, testing). Use them when the native field types genuinely can't support the interaction.
