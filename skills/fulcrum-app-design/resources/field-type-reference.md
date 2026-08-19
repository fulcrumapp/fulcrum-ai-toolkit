# Fulcrum Field Type Reference

> Source: https://docs.fulcrumapp.com/reference/forms-intro.md
> Fetched: 2026-08-19

## Universal Properties (All Field Types)

| Property | Type | Description |
|----------|------|-------------|
| type | string | Field type identifier (e.g., "TextField", "ChoiceField") |
| key | string | Unique UUID for the field element |
| data_name | string | Unique data name used in API responses and data events ($data_name) |
| label | string | Display label shown to the user |
| description | string | Optional help text displayed below the field |
| required | boolean | Whether the field must have a value before saving |
| disabled | boolean | Whether the field is read-only |
| hidden | boolean | Whether the field is hidden from view |
| visible_conditions | array | Conditional visibility rules (field, operator, value) |
| visible_conditions_type | string | "all" or "any" — how multiple conditions combine |
| required_conditions | array | Conditional requirement rules |
| required_conditions_type | string | "all" or "any" |
| parent | object | Reference to parent section/repeatable if nested |

## TextField

Text input field for short or long text entry.

| Property | Type | Description |
|----------|------|-------------|
| numeric | boolean | Restrict input to numeric values |
| format | string | Display format: "plain" or "number" |
| min_length | integer | Minimum character length |
| max_length | integer | Maximum character length |
| min | number | Minimum numeric value (when numeric: true) |
| max | number | Maximum numeric value (when numeric: true) |
| pattern | string | Regex validation pattern |
| pattern_description | string | Human-readable description of the pattern |
| default_value | string | Default value for new records |

## DateTimeField

Date and optional time picker.

| Property | Type | Description |
|----------|------|-------------|
| is_date | boolean | Date-only (true) or date+time (false) |

## TimeField

Time-only picker (HH:MM format).

No additional properties beyond universal ones.

## YesNoField

Binary toggle field (Yes/No).

| Property | Type | Description |
|----------|------|-------------|
| positive | object | Label and value for "Yes" state |
| negative | object | Label and value for "No" state |
| neutral | object | Label and value for unset/neutral state |
| neutral_enabled | boolean | Whether the neutral option is available |
| default_value | string | Default state |

## ChoiceField

Single or multiple selection from a defined list.

| Property | Type | Description |
|----------|------|-------------|
| choices | array | Array of {label, value} objects |
| multiple | boolean | Allow multiple selections |
| allow_other | boolean | Allow free-text "Other" entry |
| min_length | integer | Minimum number of selections |
| max_length | integer | Maximum number of selections |
| choice_list_id | string | Reference to a shared choice list (alternative to inline choices) |
| default_value | string | Default selected value |

## ClassificationField

Hierarchical classification picker (nested categories).

| Property | Type | Description |
|----------|------|-------------|
| classification_set_id | string | Reference to a classification set |
| allow_other | boolean | Allow free-text entries not in the set |
| default_value | string | Default classification value |

## PhotoField

Capture or attach photos.

| Property | Type | Description |
|----------|------|-------------|
| min_length | integer | Minimum number of photos required |
| max_length | integer | Maximum number of photos allowed |

## VideoField

Capture or attach video recordings.

| Property | Type | Description |
|----------|------|-------------|
| track_enabled | boolean | Enable GPS track recording during video capture |
| audio_enabled | boolean | Enable audio recording with video |
| min_length | integer | Minimum number of videos |
| max_length | integer | Maximum number of videos |

## AudioField

Capture audio recordings.

| Property | Type | Description |
|----------|------|-------------|
| min_length | integer | Minimum number of audio clips |
| max_length | integer | Maximum number of audio clips |

## SketchField

Freehand drawing/annotation field.

No additional properties beyond universal ones. Stores sketch as an image.

## BarcodeField

Scan barcodes and QR codes.

No additional properties beyond universal ones. Stores scanned value as text.

## AddressField

Structured address input with geocoding.

| Property | Type | Description |
|----------|------|-------------|
| auto_populate | boolean | Auto-populate from GPS coordinates via reverse geocoding |

Address value structure: sub_thoroughfare, thoroughfare, suite, locality, sub_admin_area, admin_area, postal_code, country

## SignatureField

Capture handwritten signatures.

| Property | Type | Description |
|----------|------|-------------|
| agreement_text | string | Text displayed above the signature pad that the signer agrees to |

## HyperlinkField

Tappable link or button that triggers a URL action or data event.

| Property | Type | Description |
|----------|------|-------------|
| default_url | string | URL template (supports variable substitution) |

Used for URL actions, opening external apps, and triggering data event click handlers.

## CalculatedField

Auto-computed value from an expression.

| Property | Type | Description |
|----------|------|-------------|
| expression | string | Calculation expression using field references and functions |
| display | object | Display configuration (currency, style, etc.) |

Expressions reference other fields using $data_name syntax. Supports math operations, string functions, conditional logic, and date functions.

## RecordLinkField

Link to records in another app (or the same app).

| Property | Type | Description |
|----------|------|-------------|
| record_link_default_form_id | string | Target form/app ID to link to |
| record_link_conditions | array | Filter conditions for which records can be linked |
| min_length | integer | Minimum number of linked records |
| max_length | integer | Maximum number of linked records |

## Section

Container element that groups fields together. Not a data field itself.

| Property | Type | Description |
|----------|------|-------------|
| elements | array | Child field elements contained in this section |
| display | object | Display rules (collapsed by default, etc.) |

Sections can be used as repeatables when `repeatable` is true — allowing users to add multiple instances of the grouped fields.

### Repeatable Section Properties

| Property | Type | Description |
|----------|------|-------------|
| repeatable | boolean | Whether this section is a repeatable |
| geometry_enabled | boolean | Enable per-entry geometry (GPS point per repeatable) |
| geometry_types | array | Allowed geometry types: ["Point"], ["LineString"], ["Polygon"], or combinations |
| min_length | integer | Minimum number of repeatable entries |
| max_length | integer | Maximum number of repeatable entries |

## Label

Display-only element for instructional text. Not a data field.

No data is stored. Used for headings, instructions, or visual separators within the form.

## StatusField

Record-level status tracking (defined at the form level, not as a child element).

| Property | Type | Description |
|----------|------|-------------|
| status_field | object | Status configuration at the form level |
| status_field.enabled | boolean | Whether status tracking is active |
| status_field.choices | array | Array of {label, value, color} objects defining available statuses |
| status_field.default_value | string | Default status for new records |

Status values drive workflow visibility, filtering, and can trigger data events via change-status.
