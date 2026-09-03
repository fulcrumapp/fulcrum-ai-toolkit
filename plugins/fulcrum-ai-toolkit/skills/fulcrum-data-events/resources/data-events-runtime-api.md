# Data Events Runtime API Reference

> Source: https://docs.fulcrumapp.com/docs/data-events-reference
> Source: https://docs.fulcrumapp.com/docs/data-events-loadfile
> Source: https://docs.fulcrumapp.com/docs/data-events-loadrecords
> Source: https://docs.fulcrumapp.com/docs/data-events-storage
> Source: https://docs.fulcrumapp.com/docs/app-extensions-introduction
> Connector authority: Live installed App MCP schemas define connector
> operations. Runtime behavior is sourced from the public references below.
> Verified: 2026-09-02

When App MCP is registered, prefer `fulcrum_expressions_data_events_reference` for the current runtime catalog. This resource is a portable fallback. Data Event JavaScript is stored in a form's `script` and is read or written with `fulcrum_forms_get` and `fulcrum_forms_update`; there are no standalone Data Event CRUD tools.

## Record Events

| Event | Description | Signature |
|-------|-------------|-----------|
| load-record | Fires when the record editor is displayed | ON('load-record', callback) |
| unload-record | Fires when editor closes | ON('unload-record', callback) |
| new-record | Fires when a new record is created, after load-record | ON('new-record', callback) |
| edit-record | Fires when a record is edited, after load-record | ON('edit-record', callback) |
| save-record | Fires immediately before a record is saved and after validation | ON('save-record', callback) |
| cancel-record | Fires after a record editing session is cancelled | ON('cancel-record', callback) |
| validate-record | Fires right before the record is saved to check validations | ON('validate-record', callback) |
| change-geometry | Fires when a record's geometry changes | ON('change-geometry', callback) |
| change-project | Fires when a record's project changes | ON('change-project', callback) |
| change-status | Fires when a record's status changes | ON('change-status', callback) |
| change-assignment | Fires when a record's assignment changes | ON('change-assignment', callback) |

### Event Object Properties
- name: Event identifier
- value: Associated value when applicable
- field: Data name when field-associated
- isValid: Boolean indicating built-in validation status
- isDraft: Boolean indicating draft save status

## Field Events

| Event | Description | Signature |
|-------|-------------|-----------|
| change | Fires when a field's value changes, including calculated fields | ON('change', 'field_name', callback) |
| focus | Fires when a text or numeric input field has received focus | ON('focus', 'field_name', callback) |
| blur | Fires when a text or numeric input field has lost focus | ON('blur', 'field_name', callback) |
| click | Fires when a hyperlink field is tapped | ON('click', 'field_name', callback) |

### Important: Default values do NOT trigger change events on new records. Change events are NOT triggered after manually setting a value with SETVALUE. Calculated field changes DO trigger events.

## Repeatable Events

| Event | Description | Signature |
|-------|-------------|-----------|
| load-repeatable | Fires when a repeatable editor is displayed | ON('load-repeatable', 'repeatable_field', callback) |
| unload-repeatable | Fires when the repeatable editor is closed | ON('unload-repeatable', 'repeatable_field', callback) |
| new-repeatable | Fires when a new repeatable is created | ON('new-repeatable', 'repeatable_field', callback) |
| edit-repeatable | Fires when an existing repeatable is edited | ON('edit-repeatable', 'repeatable_field', callback) |
| save-repeatable | Fires immediately before repeatable is saved | ON('save-repeatable', 'repeatable_field', callback) |
| cancel-repeatable | Fires when a repeatable editing session is cancelled | ON('cancel-repeatable', 'repeatable_field', callback) |
| validate-repeatable | Fires right before the repeatable is saved to check validations | ON('validate-repeatable', 'repeatable_field', callback) |
| change-geometry | Fires when a repeatable's geometry changes | ON('change-geometry', 'repeatable_field', callback) |

## Media Events

### Photo Events
| Event | Signature |
|-------|-----------|
| add-photo | ON('add-photo', 'photo_field', callback) |
| remove-photo | ON('remove-photo', 'photo_field', callback) |
| replace-photo | ON('replace-photo', 'photo_field', callback) |

add-photo event object: id, size, latitude, longitude, altitude, accuracy, direction, orientation, width, height, timestamp
remove-photo event object: id
replace-photo event object: all add-photo props + annotated (boolean), replaced (photo ID)

### Video Events
| Event | Signature |
|-------|-----------|
| add-video | ON('add-video', 'video_field', callback) |
| remove-video | ON('remove-video', 'video_field', callback) |

add-video event object: id, size, width, height, duration, orientation, track

### Audio Events
| Event | Signature |
|-------|-----------|
| add-audio | ON('add-audio', 'audio_field', callback) |
| remove-audio | ON('remove-audio', 'audio_field', callback) |

add-audio event object: id, size, duration

## Core Functions

| Function | Purpose |
|----------|---------|
| ON(event, [field], callback) | Register event listener |
| OFF(event, [field]) | Remove event listener |
| SETVALUE(field_name, value) | Set a field's value programmatically |
| SETCHOICES(field_name, choices_array) | Override a choice field's options dynamically |
| SETCHOICEFILTER(field_name, filter) | Filter choice list options |
| SETLOCATION(latitude, longitude) | Set the record's GPS location |
| SETGEOMETRY(geojson) | Set the record's geometry (point, line, polygon) |
| SETPROJECT(project_id) | Set the record's project |
| SETSTATUS(status_value) | Set the record's status |
| SETASSIGNMENT(email) | Set the record's assignment |
| INVALID(message) | Display validation error, prevent save (use in validate-record/validate-repeatable only) |
| ALERT(title, message) | Display an alert dialog to the user |
| PROGRESS(title, message) | Display a progress indicator |
| OPENURL(url) | Open a URL in the device browser |
| DATANAMES(element) | Return an array of field data names |
| SETMINLENGTH(field_name, length) | Set minimum length dynamically |
| SETMAXLENGTH(field_name, length) | Set maximum length dynamically |
| SETFORMATTRIBUTES(attributes) | Customize app behavior (geometry types, auto-sync, etc.) |
| INSPECT(object) | Output object content for debugging |
| REQUEST(options, callback) | Make HTTP request (GET, POST, PUT). Async — response processing must be in callback |
| LOADFILE({ name, form_name/form_id, variable }, callback) | Load a Reference File, optionally from another form, and optionally bind its exported content to a variable |
| OPENEXTENSION({ url, title, data, onMessage }) | Open an App Extension; use `attachment://filename.html` for a Reference File |
| SETRESULT(value) | Set the result of a calculation field |
| FIELD(data_name) | Return field metadata object (key, type, label, etc.) |
| FORM() | Return the current form (app); `FORM().id` is its identifier |
| RECORDID() | Return the current record's identifier, or null until a new record has been saved |
| STORAGE() | Return a device-wide, persistent local-storage-like object with getItem, setItem, removeItem, and clear |
| CONFIG() | Access the current configuration/results object |

## Key Constraints

1. SETVALUE does NOT trigger change events — avoid infinite loops
2. INVALID() only works inside validate-record and validate-repeatable handlers
3. REQUEST() is async — process responses inside the callback, not after it
4. Default values do NOT trigger change events on new records
5. Data events run on mobile devices — keep code lightweight, avoid heavy computation
6. console.log is not available — use ALERT or INSPECT for debugging
7. LOADFILE takes an options object, not a URL or positional filename
8. STORAGE() is device-wide and persistent — scope every key with `FORM().id` and the record it belongs to, and remove it on `cancel-record` and `unload-record`
9. RECORDID() is null until a new record has been saved, so it cannot distinguish one unsaved record from the next
