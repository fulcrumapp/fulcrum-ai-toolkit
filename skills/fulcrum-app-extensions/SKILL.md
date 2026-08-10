---
name: fulcrum-app-extensions
description: Use when building, modifying, or reviewing Fulcrum app extensions — custom HTML/CSS/JavaScript UIs embedded inside a record. Covers extension anatomy, the Fulcrum bridge API, data exchange patterns, offline support decisions, extension types, and the picker anti-pattern. Also use when a builder asks about custom field types, embedded UIs, or SVG-based inputs inside Fulcrum records.
---

An **app extension** is a custom HTML/CSS/JavaScript UI that runs inside a Fulcrum record on iOS,
Android, and web. It lets you build data collection interfaces that Fulcrum doesn't support natively
— custom pickers, embedded charts, SVG area selection, Bluetooth input, complex validation UIs.

Extensions communicate with the host record through a JavaScript bridge. The data lives in standard
Fulcrum fields and syncs normally.

> **Provenance of this file (corrected 2026-08-10).** The API below is verified against three
> independent sources that all agree: Fulcrum's official documentation
> (`docs.fulcrumapp.com/docs/openextension`), the "App Extensions Patterns" reference app, and
> live production extensions. A previous version of this skill documented an `FS.getValue` /
> `FS.setFieldValue` / `FS.close` API — **that API does not exist**: it appears nowhere in Fulcrum's
> official docs, nor in any working extension. Sections marked *(local convention)* are team
> practice, not vendor-documented.

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

## The Bridge — how the two halves talk

An extension is **two pieces**: a Data Events script that opens it, and a self-contained HTML file.
Data flows **in** through the `data` parameter and **out** through `onMessage`. There is no API for
the extension to read or write record fields directly — everything goes through this round trip.

### Half 1 — the Data Events script

```javascript
ON('click', 'some_button', () => {
  OPENEXTENSION({
    url:   'attachment://my-extension.html',   // or any https:// address
    title: 'My Extension',
    data:  { test_value: $test_value },        // passed IN to the extension
    onMessage: ({ data }) => {                 // called when the extension sends/finishes
      SETVALUE('test_value', data.simple_result);
    }
  });
});
```

`OPENEXTENSION` takes **a single options object** — not `(url, options)`.

### Half 2 — the HTML file

Every extension must include Fulcrum's bootstrap script, which defines `window.Fulcrum`. Copy it
verbatim from `docs.fulcrumapp.com/docs/openextension` or from an existing working extension; it is
minified and not meant to be edited.

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <!-- Fulcrum extension bootstrap — defines window.Fulcrum. Copy verbatim. -->
    <script type="text/javascript">(()=>{ /* … minified Fulcrum bridge … */ })();</script>

    <script type="text/javascript">
      // load() fires once the host has handed over the payload.
      Fulcrum.load(({ data }) => {
        const button = document.querySelector('button');
        button.textContent = `Hello ${data.test_value + 1}!`;

        button.addEventListener('click', () => {
          // finish() sends a result back to onMessage AND closes the extension.
          Fulcrum.finish({ simple_result: data.test_value + 1 });
        });
      });
    </script>
  </head>
  <body><button>Hello</button></body>
</html>
```

### The bridge API, in full

| Call | Purpose |
|------|---------|
| `Fulcrum.load(cb)` | `cb({data})` fires when the payload is ready. **Entry point — put all setup here.** |
| `Fulcrum.send(payload)` | Send a result to `onMessage` and leave the extension **open**. |
| `Fulcrum.send(payload, {close:true})` | Send and close. |
| `Fulcrum.finish(payload)` | Shorthand for the above — send and close. **Usual exit point.** |
| `Fulcrum.data` | The raw payload, if you need it outside `load()`. |
| `Fulcrum.isExtension` | `true` when running inside Fulcrum; useful for browser-testing a page standalone. |

**Reading and writing record fields:** the extension cannot. It receives what the Data Events script
chose to pass in `data`, and returns a result the Data Events script writes back with `SETVALUE`.
When you need repeatable rows, pass `VALUE('repeatable_name')` in — it yields
`[{id, form_values:{…}}, …]` — and write the modified array back in `onMessage`.

## Offline Support — The Key Design Decision

Whether an extension works offline depends entirely on where its assets live.

| Asset location | Offline? | Tradeoff |
|---------------|----------|----------|
| Uploaded as a **Reference File**, referenced `attachment://name.html` | **Yes** | Must manage updates manually |
| Loaded from a CDN (jsDelivr, cdnjs, unpkg) | **No** | Easy libraries; breaks offline |
| Embedded inline in the HTML file | **Yes** | Larger file; no external dependencies |

**Decision:** if the extension is used during offline field work, host it as a Reference File and
inline all JavaScript and CSS. Fulcrum's own docs state that Reference Files are what makes an
extension work offline.

⚠️ **Scheme gotcha:** the correct scheme is **`attachment://`** (singular). Fulcrum's own
documentation prose says `attachments://` in one place — that is a typo; their code sample and every
working extension use the singular.

**CDN version pinning:** if you do use CDN libraries (online-only extensions), lock to an exact
version. Unversioned URLs break silently when the library updates.

```html
<!-- BAD  --> <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<!-- GOOD --> <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
```

## Uploading and Attaching Extensions

The extension HTML file is uploaded as a **Reference File** on the form. When the Fulcrum MCP is
available, it can do this directly:

```
Step 1: fulcrum_extensions_generate(pattern="picker", ...)  — generate the code
Step 2: fulcrum_reference_files_upload(form_id=..., file_content=..., filename="picker.html")
Step 3: fulcrum_forms_update(form_id=..., script=<data_event_JS_with_OPENEXTENSION>)
```

Or use `fulcrum_extensions_list_patterns` and `fulcrum_extensions_explain(pattern="picker")` to
explore available patterns before generating.

### Manual UI fallback

When the Fulcrum MCP is unavailable:

1. Save the extension as an `.html` file with all offline-required assets embedded or included as
   Reference Files.
2. In Fulcrum, open the target form and upload the file under **Reference Files**.
3. Add or update the form's data event script with the `OPENEXTENSION()` handler, using the uploaded
   file's exact filename.
4. Test the trigger and the write-back behavior in the form preview, then test again on a device if
   the workflow must work offline.

Do not treat the MCP commands above as prerequisites; they are an automation path only.

### Verifying what is actually live *(local convention)*

Reference Files are form-level storage reached through the **web form builder**; teams have found
they are not writable through the REST attachments API, so plan on a manual upload per form. Existing
files can still be **read** back via `GET attachments/<id>`.

Two practical consequences:

- A change to one shared extension used by N forms is **N uploads**. Get it right before iterating.
- After uploading, download the live copy and compare a checksum against your source. Drift between
  the repo and what is actually running is otherwise invisible — and an extension that silently
  disagrees with the record's own calculations is very hard to spot from the outside.

## Anti-Patterns

### ChoiceField as picker target *(local convention)*
Storing a picker extension's result in a ChoiceField causes the native picker UI to compete with the
extension. Prefer a **TextField** for free-text results, with a trigger field the user taps.
**RecordLinkField is a valid and proven target** when the extension picks a record from a linked app
— that is exactly what Fulcrum's own linked-record pattern does, writing back with
`SETVALUE('linked_record', selected)`.

### External assets for offline extensions
Any script, style, or font fetched from a URL in an extension intended for offline use. With no
connection the asset fails silently and the extension renders blank or broken.

### Extension as a data event replacement
Building an extension for logic data events already handle (show/hide, cascade, calculate). Splitting
logic between data events and extension code makes an app harder to maintain. Use extensions only
when the UI genuinely cannot be built natively.

### Duplicating calculation logic inside the extension
If a value is computed by a CalculatedField or data event, the extension must not reimplement that
rule from memory — the copies drift and the extension silently shows different numbers from the
record. Either display the stored value, or **pass the rule's parameters in via `data`** so one
implementation is driven by configuration rather than duplicated per region or per form.

### Unbounded payloads
`data` is serialized across the bridge on every open. Passing a large linked-record list (tens of
thousands of rows) makes the extension slow to open, worst on older devices. Pass a trimmed
projection of only the fields the UI needs, and filter client-side.

### Unbounded extension scope
An extension that tries to replicate an entire sub-application. Extensions are panels inside a
record. If it needs its own database, navigation, or lifecycle, that's a linked child app.

## Completion Criteria

- [ ] Uses `OPENEXTENSION({url, title, data, onMessage})` — a single options object
- [ ] HTML includes the Fulcrum bootstrap; all setup runs inside `Fulcrum.load(({data}) => …)`
- [ ] Exits via `Fulcrum.finish(payload)`; the Data Events `onMessage` writes results with `SETVALUE`
- [ ] Offline decision is explicit: Reference File + inlined assets (offline) vs CDN (online-only)
- [ ] `attachment://` (singular) for Reference File URLs
- [ ] Any CDN reference uses a locked exact version
- [ ] Picker results land in an appropriate field type — TextField or RecordLinkField, not ChoiceField
- [ ] No calculation rule is duplicated from a CalculatedField or data event; parameters passed in
- [ ] `data` payload is a trimmed projection, not whole record sets
- [ ] Data flows documented: what goes in via `data`, what comes back via `onMessage`
- [ ] After upload, live copy verified against the repo source by checksum
