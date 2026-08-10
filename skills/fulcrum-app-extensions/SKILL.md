---
name: fulcrum-app-extensions
description: Use when building, modifying, or reviewing Fulcrum app extensions — custom HTML/CSS/JavaScript UIs embedded inside a record. Covers extension anatomy, data exchange patterns, offline support decisions, extension types, and the picker anti-pattern. Also use when a builder asks about custom field types, embedded UIs, or SVG-based inputs inside Fulcrum records.
---

An **app extension** is a custom HTML/CSS/JavaScript UI that runs inside a Fulcrum record on iOS, Android, and web. It lets you build data collection interfaces that Fulcrum doesn't support natively — custom pickers, embedded charts, SVG area selection, Bluetooth input, complex validation UIs.

Extensions communicate with the Fulcrum record through the data events API bridge. The data lives in standard Fulcrum fields and syncs normally.

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

An app extension is a self-contained HTML file. It communicates with the Fulcrum record via a JavaScript bridge object (`FS`) that is injected at runtime.

```html
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
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
    // The FS bridge is injected by Fulcrum at runtime
    // It provides access to the record and data events API

    // Pre-populate from the current field value
    var select = document.getElementById('my-select');
    select.value = FS.getValue('my_field') || '';

    // Write the selected value back to the record on save
    document.getElementById('save-btn').addEventListener('click', function() {
      FS.setFieldValue('my_field', select.value);
      FS.close(); // close the extension panel
    });
  </script>
</body>
</html>
```

## Data Exchange — Reading and Writing Record Fields

Extensions communicate bidirectionally with the host record:

### Reading values into the extension

```javascript
// Get the current value of a field
var existingValue = FS.getValue('species_name');

// Get a choice field's selected values
var selectedChoices = FS.getChoiceValues('habitat_types');

// Get the record's current GPS location
var location = FS.getLocation(); // { latitude, longitude, accuracy }
```

### Writing values back to the record

```javascript
// Set a field value — the primary output mechanism
FS.setFieldValue('species_name', 'Quercus agrifolia');

// Set multiple fields at once
FS.setFieldValues({
  species_name: 'Quercus agrifolia',
  confidence_level: 'High',
  identified_at: new Date().toISOString()
});

// Close the extension panel after writing
FS.close();
```

### Triggering from data events (OPENEXTENSION)

The data event that opens an extension is the other half of the bridge. Configure it via `ON('click', ...)` on a trigger field:

```javascript
// In the form's data events — open the extension when a button field is clicked
ON('click', 'open_picker_btn', function(event) {
  OPENEXTENSION('my_extension_reference_file.html', {
    // Optional: pass context data into the extension
    currentValue: VALUE('species_name'),
    mode: 'picker'
  });
});
```

Access the context data inside the extension:

```javascript
// Inside the extension HTML
var context = FS.getContext(); // returns the options object passed to OPENEXTENSION
var currentValue = context.currentValue;
```

## The Picker Pattern — Read This First

**The picker pattern is the most misunderstood extension type.**

The picker extension REPLACES the native picker UI. It does not augment it. This has one critical implication for field type selection:

> **Do not use a ChoiceField to store a picker extension's result. Use a TextField.**

The ChoiceField has its own picker UI that conflicts with the extension. The correct pattern:

1. **TextField** — stores the selected value (what the extension writes back)
2. **HyperlinkField** — the trigger button; user taps it to open the extension
3. `ON('click', ...)` on the HyperlinkField → `OPENEXTENSION(...)` in data events
4. Extension writes result back to the TextField via `FS.setFieldValue()`

```javascript
// Data events — opens extension when user taps the hyperlink button
ON('click', 'open_species_picker', function(event) {
  OPENEXTENSION('species_picker.html', {
    currentValue: VALUE('selected_species')
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

The extension HTML file is uploaded as a **Reference File** on the form. When the Fulcrum MCP is available, it can do this directly:

```
Step 1: fulcrum_extensions_generate(pattern="picker", ...)  — generate the code
Step 2: fulcrum_reference_files_upload(form_id=..., file_content=..., filename="picker.html")
Step 3: fulcrum_forms_update(form_id=..., script=<data_event_JS_with_OPENEXTENSION>)
```

Or use `fulcrum_extensions_list_patterns` and `fulcrum_extensions_explain(pattern="picker")` to explore available patterns before generating.

### Manual UI fallback

When the Fulcrum MCP is unavailable:

1. Save the extension as an `.html` file with all offline-required assets embedded or included as Reference Files.
2. In Fulcrum, open the target form and upload the file under **Reference Files**.
3. Add or update the form's data event script with the `OPENEXTENSION()` handler, using the uploaded file's exact filename.
4. Test the trigger and the write-back behavior in the form preview, then test again on a device if the workflow must work offline.

Do not treat the MCP commands above as prerequisites; they are an automation path only.

## Anti-Patterns

### ChoiceField as picker target
Using a ChoiceField to store the picker extension result causes a conflict between the native picker UI and the extension. Use TextField. See the Picker Pattern section above.

### External assets for offline extensions
Loading any script, style, or asset from a URL in an extension intended for offline use. If the device has no connection, the asset fails to load silently — the extension may render blank or broken.

### Extension as a data event replacement
Building an extension for logic that data events handle well (show/hide, cascade, calculate). Extensions add complexity — an app is harder to maintain when logic is split between data events and extension code. Use extensions only when you need a custom UI.

### Unbounded extension scope
An extension that tries to replicate an entire sub-application. Extensions are panels inside a record, not standalone apps. If the extension needs its own database, navigation, or lifecycle, that's a linked child app.

## Completion Criteria

- [ ] Field type for picker result is TextField, not ChoiceField — trigger is HyperlinkField
- [ ] Offline support decision is explicit: Reference Files (offline) vs. CDN (online-only)
- [ ] All CDN library references use locked semver versions — no `latest` or unversioned URLs
- [ ] Extension is scoped to a UI problem that native fields can't solve — not a data event replacement
- [ ] Data flows are documented: what fields the extension reads, what fields it writes back
- [ ] `OPENEXTENSION()` call in data events passes any needed context to the extension
- [ ] Extension closes (`FS.close()`) after writing values back to the record
