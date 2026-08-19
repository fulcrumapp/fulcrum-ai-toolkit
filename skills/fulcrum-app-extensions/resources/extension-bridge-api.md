# App Extension Bridge API Reference

> Source: Fulcrum developer documentation
> Fetched: 2026-08-19

## Overview

App extensions are custom HTML/CSS/JavaScript UIs embedded inside a Fulcrum record via an iframe. They communicate with the host app through a postMessage bridge.

## OPENEXTENSION()

Called from a Data Event to open an extension:

```javascript
OPENEXTENSION('extension_data_name', function(result) {
  // result contains data returned by the extension
  if (result && result.value) {
    SETVALUE('target_field', result.value);
  }
});
```

## Bridge Communication

Extensions communicate with Fulcrum via window.parent.postMessage:

### Extension to Host Messages
- Set result: `window.parent.postMessage({type: 'result', value: data}, '*')`
- Close: `window.parent.postMessage({type: 'close'}, '*')`
- Get current values: `window.parent.postMessage({type: 'getCurrentValues'}, '*')`

### Host to Extension Messages
Extensions receive messages via window.addEventListener('message', handler):
- Initial context with record data and form schema
- Response to getCurrentValues requests

## Sandbox Constraints

- Extensions run in a sandboxed iframe
- No direct DOM access to the parent Fulcrum app
- window.print() and direct PDF download are blocked
- Extensions must be self-contained (inline CSS/JS or bundled)
- Network requests from extensions are subject to CORS
- Extensions should work offline when possible (bundle all dependencies)

## Extension Field Properties

In the form schema, an extension field has:
- type: "HyperlinkField" with display.style set to "button"
- The extension HTML is stored in the field's default_url or as an attachment

## Common Patterns

1. **Picker/Selector**: Open extension, user selects from custom UI, return selection to form field
2. **Calculator**: Complex calculations with custom UI, return computed values
3. **Visualization**: Display data in charts/maps/diagrams within the record
4. **Data Entry**: Custom input interfaces (drawing tools, schematic builders, etc.)

## Anti-Pattern: The Picker Trap

Don't build an extension just to replicate what a choice field or record link can do. Extensions add complexity (offline support, maintenance, testing). Use them when the native field types genuinely can't support the interaction.
