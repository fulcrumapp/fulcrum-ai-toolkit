---
name: fulcrum-app-extensions
description: Use when building, modifying, or reviewing Fulcrum App Extensions. Defers pattern knowledge and artifact generation to App MCP, then covers the generated bridge contract, Reference File workflow, offline decisions, data exchange, and picker anti-pattern.
---

An **app extension** is a custom HTML/CSS/JavaScript UI that runs inside a Fulcrum record on iOS, Android, and web. It lets you build data collection interfaces that Fulcrum doesn't support natively — custom pickers, embedded charts, SVG area selection, Bluetooth input, complex validation UIs.

Extensions communicate with the Fulcrum record through the data events API bridge. The data lives in standard Fulcrum fields and syncs normally.

> **Provenance:** The bridge API and event flow in this skill follow Fulcrum's documented extension API. Field-type recommendations, offline decisions, and payload-sizing guidance are toolkit conventions unless explicitly attributed.

## App MCP Knowledge And Generation

When Fulcrum App MCP is registered, use `fulcrum_extensions_list_patterns` and `fulcrum_extensions_explain` to select a supported pattern, then use `fulcrum_extensions_generate` for the Data Event, HTML, and setup notes. Treat those registered tools as the current extension contract instead of recreating a remembered bootstrap or bridge.

> Connector authority: Live installed App MCP schemas define generated
> artifacts. The bridge behavior comes from the
> [Fulcrum App Extensions introduction](https://docs.fulcrumapp.com/docs/app-extensions-introduction).
>
> Source: [Fulcrum App Extensions introduction](https://docs.fulcrumapp.com/docs/app-extensions-introduction).

## When to Use an Extension vs. a Data Event

| Use a data event when... | Use an app extension when... |
|--------------------------|------------------------------|
| Logic and automation that doesn't require a custom UI | You need a UI that native fields can't provide |
| Showing/hiding fields conditionally | Custom pickers, image selectors, color ramps |
| Cascading choices, validation, calculations | Rich multi-step input flows |
| Simple lookups that return a single value | Embedded charts or graphs inside a record |
| Role-based field visibility | Complex forms with their own validation |
| The workflow works with native Fulcrum fields | The native field types are the wrong UX |

## Extension Types

| Pattern | Use case |
|---------|----------|
| `picker` | Custom search/lookup UI — replaces the native choice picker |
| `editor` | Rich editing UI for complex structured data |
| `visualization` | Embedded charts, maps, or dashboards within a record |
| `input` | Device/sensor input (Bluetooth measurements, hardware interfaces) |
| `integration` | Backend sync or lookup within the record UI |

## Extension Anatomy

An app extension has two parts: a Data Event script that opens the extension, and a custom HTML page that runs in Fulcrum's sandboxed browser panel. The generated Data Event passes values with `OPENEXTENSION({ url, title, data, onMessage })`. The generated HTML embeds the current Fulcrum bootstrap inline, receives a payload shaped as `{ data }`, and returns results with `Fulcrum.finish(result)`.

Do not substitute an old external bootstrap URL. Start from the complete HTML returned by `fulcrum_extensions_generate`, which includes the current standalone bootstrap needed for Reference File and offline use.

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <!-- The generated artifact contains Fulcrum's current inline bootstrap here. -->
  <style>
    /* Keep styles self-contained — no external stylesheets at runtime */
    body { font-family: sans-serif; margin: 0; padding: 16px; }
  </style>
</head>
<body>
  <select id="my-select">
    <option value="">-- choose --</option>
    <option value="option_a">Option A</option>
    <option value="option_b">Option B</option>
  </select>
  <button id="save-btn">Save</button>
  <script>
    var select = document.getElementById('my-select');

    Fulcrum.load(function(payload) {
      initialize(payload.data || {});
    });

    function initialize(data) {
      select.value = data.current_value || '';
    }

    document.getElementById('save-btn').addEventListener('click', function() {
      var selectedValue = document.getElementById('my-select').value;
      Fulcrum.finish({ value: selectedValue });
    });
  </script>
</body>
</html>
```

> Source: The payload and inline-bootstrap semantics above follow the
> [public App Extensions quick start](https://docs.fulcrumapp.com/docs/app-extensions-introduction#quick-start);
> live installed App MCP schemas govern generated artifacts.

## Data Exchange — Reading and Writing Record Fields

Extensions exchange data with the host through the Data Event that opened them. `Fulcrum.load(callback)` receives a payload whose `data` property is the object passed to `OPENEXTENSION`. `Fulcrum.finish(result)` returns an `onMessage` payload whose `data` property is that result. The Data Event remains responsible for reading and writing Fulcrum fields.

### Passing values into the extension

```javascript
// In the form's Data Event script:
ON('click', 'open_picker_btn', function() {
  OPENEXTENSION({
    url: 'attachment://species_picker.html',
    title: 'Species picker',
    data: {
      current_value: VALUE('species_name'),
      record_id: RECORDID()
    },
    onMessage: function(message) {
      var data = message && message.data;
      if (data) {
        SETVALUE('species_name', data.value);
      }
    }
  });
});
```

Inside the HTML extension, receive the data with `Fulcrum.load(...)`:

```javascript
Fulcrum.load(function(payload) {
  var data = payload.data || {};
  var currentValue = data.current_value;
  var recordId = data.record_id;
});
```

### Triggering from data events (OPENEXTENSION)

The Data Event opens the extension with an options object. When the HTML page calls `Fulcrum.finish(data)`, the Data Event's `onMessage` callback receives the result and can write it to form fields:

```javascript
ON('click', 'open_picker_btn', function() {
  OPENEXTENSION({
    url: 'attachment://my_extension_reference_file.html',
    title: 'My extension',
    data: {
      current_value: VALUE('species_name'),
      mode: 'picker'
    },
    onMessage: function(message) {
      var data = message && message.data;
      if (data) {
        SETVALUE('species_name', data.value);
      }
    }
  });
});
```

Access the context data inside the HTML page:

```javascript
Fulcrum.load(function(payload) {
  var currentValue = (payload.data || {}).current_value;
});
```

## The Picker Pattern — Read This First

**The picker pattern is the most misunderstood extension type.**

The picker extension REPLACES the native picker UI. It does not augment it. This has one critical implication for field type selection:

> **Do not use a ChoiceField when the extension is replacing the native choice-picker UI. Use a TextField for a free-form selected value or a RecordLinkField when the picker selects a Fulcrum record.**

The ChoiceField has its own picker UI that conflicts with the extension. The correct pattern:

1. **TextField** — stores a free-form selected value
2. **RecordLinkField** — stores a selected Fulcrum record when the picker returns a record link
3. **HyperlinkField** — the trigger button; user taps it to open the extension
4. `ON('click', ...)` on the HyperlinkField → `OPENEXTENSION(...)` in data events
5. Extension returns the selected value with `Fulcrum.finish()`; the Data Event writes it back to the target field.

```javascript
// Data events — opens extension when user taps the hyperlink button
ON('click', 'open_species_picker', function(event) {
  OPENEXTENSION({
    url: 'attachment://species_picker.html',
    data: { current_value: VALUE('selected_species') },
    onMessage: function(message) {
      var data = message && message.data;
      if (data) {
        SETVALUE('selected_species', data.value);
      }
    }
  });
});
```

Getting this wrong means building the extension and the form around the wrong field type — an expensive rework. Lock the field type decision before writing extension code.

## Offline Support — The Key Design Decision

Whether an extension works offline depends entirely on where its assets are hosted.

| Asset location | Offline? | Tradeoff |
|---------------|----------|----------|
| Uploaded to Fulcrum Reference Files | **Yes** | Must manage updates; no CDN conveniences |
| Loaded from a CDN (jsDelivr, cdnjs, unpkg) | **No** | Easy to add libraries; breaks offline |
| Embedded inline in the HTML file | **Yes** | Larger file size; no external dependencies |

**Decision:** If the extension is needed during offline field work, host everything in Reference Files and inline all JavaScript. If the extension is only used in the office (online), CDN libraries are acceptable.

**CDN version pinning:** If you use CDN libraries, always lock to a specific semver version. `latest` or unversioned CDN URLs break silently when the library updates.

```html
<!-- BAD — will break when chart.js pushes a major update -->
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

<!-- GOOD — locked version, predictable behavior -->
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
```

## Uploading and Attaching Extensions

The extension HTML file is uploaded as a **Reference File** on the form. When App MCP is available, use the generated artifacts without changing their bridge contract:

> Connector authority: Live installed App MCP schemas define exact tool
> arguments and the generated Reference File workflow.

```
Step 1: fulcrum_extensions_generate(
          pattern="picker",
          name="species-picker",
          description="Select a species",
          field_name="open_species_picker"
        )
Step 2: fulcrum_reference_files_upload(
          form_id=...,
          file_name="species-picker.html",
          content=<generated HTML>
        )
Step 3: fulcrum_forms_get(id=...)
Step 4: fulcrum_forms_update(
          id=...,
          script=<existing script plus generated Data Event>
        )
```

Use `fulcrum_extensions_list_patterns` and `fulcrum_extensions_explain(pattern="picker")` to explore registered patterns before generating. There is no standalone Data Event update tool; preserve the existing form `script` through the form get/update operations.

### Manual UI fallback

When App MCP is unavailable:

1. Save the extension as an `.html` file with all offline-required assets embedded or included as Reference Files.
2. In Fulcrum, open the target form and upload the file under **Reference Files**.
3. Add or update the form's data event script with the `OPENEXTENSION()` handler, using the uploaded file's exact filename.
4. Test the trigger and the write-back behavior in the form preview, then test again on a device if the workflow must work offline.

Do not treat the MCP commands above as prerequisites; they are an automation path only.

## Anti-Patterns

### ChoiceField as picker target
Using a ChoiceField to store the result of an extension that replaces the native choice picker causes a UI conflict. Use a TextField for free-form values or a RecordLinkField for selected Fulcrum records. See the Picker Pattern section above.

### Duplicated calculation logic
Do not reimplement a CalculatedField or data-event rule inside extension JavaScript. The two implementations can drift and show different values for the same record. Prefer displaying the stored calculated value, or pass the rule's parameters through `data` so one configurable implementation drives the extension.

### Unbounded bridge payloads
Do not pass an entire `LOADRECORDS()` result through `OPENEXTENSION()` when the collection can be large. Filter before opening the extension and pass only the fields the UI needs. For larger datasets, use a bounded result, search, or pagination strategy appropriate to the workflow.

### External assets for offline extensions
Loading any script, style, or asset from a URL in an extension intended for offline use. If the device has no connection, the asset fails to load silently — the extension may render blank or broken.

### Handwritten or stale bridge bootstrap
Do not copy an old hosted bootstrap script or invent the `Fulcrum.load` payload shape. Use the full HTML returned by `fulcrum_extensions_generate`; its inline bootstrap and `{ data }` payload contract are versioned with App MCP.

### Extension as a data event replacement
Building an extension for logic that data events handle well (show/hide, cascade, calculate). Extensions add complexity — an app is harder to maintain when logic is split between data events and extension code. Use extensions only when you need a custom UI.

### Unbounded extension scope
An extension that tries to replicate an entire sub-application. Extensions are panels inside a record, not standalone apps. If the extension needs its own database, navigation, or lifecycle, that's a linked child app.

## Completion Criteria

- [ ] Picker target is a TextField for free-form values or a RecordLinkField for selected Fulcrum records — not a conflicting ChoiceField
- [ ] Offline support decision is explicit: Reference Files (offline) vs. CDN (online-only)
- [ ] All CDN library references use locked semver versions — no `latest` or unversioned URLs
- [ ] Extension is scoped to a UI problem that native fields can't solve — not a data event replacement
- [ ] Data flows are documented: what fields the extension reads, what fields it writes back
- [ ] `OPENEXTENSION()` call in data events passes any needed context to the extension
- [ ] Extension returns results with `Fulcrum.finish()` after the user completes the interaction
- [ ] App MCP-generated HTML retains its inline bootstrap and `payload.data` initialization semantics
- [ ] Existing form Data Event handlers were preserved when the generated handler was appended

## References

- [Fulcrum app extensions introduction](https://docs.fulcrumapp.com/docs/app-extensions-introduction)
- [Fulcrum offline capabilities](https://docs.fulcrumapp.com/docs/offline-capabilities)
