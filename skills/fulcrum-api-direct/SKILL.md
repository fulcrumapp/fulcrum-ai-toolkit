---
name: fulcrum-api-direct
description: Use when building Fulcrum apps, records, or resources directly via the REST API using an API key — without MCP. Covers authentication, endpoint patterns, creating apps/forms, creating records, uploading files, and common pitfalls. Use this when no Fulcrum MCP connector is available and the builder wants to create or modify Fulcrum resources programmatically.
---

# Fulcrum API Direct — Build Without MCP

When no MCP connector is available, you can create and manage Fulcrum resources directly via the REST API using an API key. This skill teaches you how.

## Authentication

Every request requires an `X-ApiToken` header with a valid Fulcrum API token.

```bash
curl -H "X-ApiToken: YOUR_API_TOKEN" \
     -H "Content-Type: application/json" \
     https://api.fulcrumapp.com/api/v2/forms.json
```

**Where to get the token:** Fulcrum web app → Settings → API → Generate Token. Or use an existing token from `.env`:

```
FULCRUM_API_TOKEN=your_token_here
```

**Base URL:** `https://api.fulcrumapp.com/api/v2`

For EU instances: `https://api.fulcrumapp.eu/api/v2`

**Important:** Every endpoint requires the `.json` suffix (e.g., `/api/v2/forms.json`), EXCEPT the attachments resource which rejects it.

## Creating an App (Form)

```bash
POST /api/v2/forms.json
```

**Minimum payload:**

```json
{
  "form": {
    "name": "My New App",
    "elements": [
      {
        "type": "TextField",
        "key": "field_1",
        "label": "Inspector Name",
        "data_name": "inspector_name",
        "required": false,
        "hidden": false,
        "disabled": false
      }
    ]
  }
}
```

**Critical rules:**
- Every element MUST include `required`, `hidden`, and `disabled` as explicit booleans — omitting them causes 422 errors
- `key` must be unique within the form, lowercase, letters/numbers/underscores only
- `data_name` is the export column header (max 10 chars for shapefile compatibility)
- The response includes the `id` (form_id) you'll need for creating records

**Field types:** See `fulcrum-app-design/resources/field-type-reference.md` for all 19 types with their properties.

## Updating an App

```bash
PUT /api/v2/forms/{id}.json
```

**Warning:** The entire form object is required when updating. Omitting existing elements will result in data loss. Always GET the form first, modify what you need, then PUT the full object back.

**Update requires:**
- `name` — required even if unchanged
- All elements with `required`, `hidden`, `disabled` booleans explicit
- The full `elements` array — not just the changed fields

**Safe update pattern:**

```javascript
// 1. GET current form
const form = await fetch(`${BASE}/forms/${formId}.json`, {headers}).then(r => r.json());

// 2. Modify what you need
form.form.elements.push(newField);

// 3. PUT the full form back
await fetch(`${BASE}/forms/${formId}.json`, {
  method: 'PUT',
  headers: {'X-ApiToken': token, 'Content-Type': 'application/json'},
  body: JSON.stringify(form)
});
```

## Creating Records

```bash
POST /api/v2/records.json
```

```json
{
  "record": {
    "form_id": "your-form-id",
    "latitude": 37.7749,
    "longitude": -122.4194,
    "form_values": {
      "field_key_1": "Value for field 1",
      "field_key_2": "Value for field 2"
    },
    "status": "active"
  }
}
```

**Key points:**
- `form_values` keys are the field `key` values (not `data_name`)
- Choice fields: use `{"choice_values": ["selected_value"], "other_values": []}`
- Yes/No fields: use `"yes"`, `"no"`, or `"n/a"`
- Record link fields: use `[{"record_id": "linked-record-id"}]`
- Photo/video/audio fields: upload media first (see below), then reference by ID

## RecordLinkField — Common Pitfall

When creating a form with RecordLinkField:

```json
{
  "type": "RecordLinkField",
  "key": "linked_app",
  "label": "Linked App",
  "data_name": "linked_app",
  "required": false,
  "hidden": false,
  "disabled": false,
  "form_id": "the-linked-form-id",
  "allow_existing_records": true,
  "allow_creating_records": false,
  "allow_updating_records": false,
  "allow_multiple_records": false
}
```

**The parameter is `form_id`** — not `record_link_form_id`. At least one of `allow_existing_records` or `allow_creating_records` must be `true`.

## ChoiceField — Multiple Selection

To enable multi-select on a choice field, include `"multiple": true`:

```json
{
  "type": "ChoiceField",
  "key": "categories",
  "label": "Categories",
  "data_name": "categories",
  "required": false,
  "hidden": false,
  "disabled": false,
  "multiple": true,
  "allow_other": false,
  "choices": [
    {"label": "Category A", "value": "cat_a"},
    {"label": "Category B", "value": "cat_b"}
  ]
}
```

## Uploading Photos

Photo upload is a two-step process:

1. **Create the photo record** to get a presigned upload URL:

```bash
POST /api/v2/photos.json
{
  "photo": {
    "access_key": "unique-uuid-you-generate",
    "form_id": "your-form-id",
    "record_id": "your-record-id",
    "field_key": "photo_field_key",
    "file_size": 12345,
    "content_type": "image/jpeg"
  }
}
```

2. **Upload the file** to the presigned URL from the response.

Then reference the photo's `access_key` in the record's `form_values` for that photo field.

## Choice Lists (Shared)

Create org-level shared choice lists:

```bash
POST /api/v2/choice_lists.json
{
  "choice_list": {
    "name": "Inspection Status",
    "choices": [
      {"label": "Pass", "value": "pass"},
      {"label": "Fail", "value": "fail"},
      {"label": "Needs Review", "value": "needs_review"}
    ]
  }
}
```

Then reference in a ChoiceField: `"choice_list_id": "the-choice-list-id"`

## Common Patterns

### Check if a form already exists

```bash
GET /api/v2/forms.json
```

Search the response for a matching name. The API doesn't support name-based filtering — you get all forms and filter client-side.

### Data Events (Script)

Data events are JavaScript stored in the form's `script` property:

```json
{
  "form": {
    "name": "My App",
    "script": "ON('load-record', function() { ... });",
    "elements": [...]
  }
}
```

See `fulcrum-data-events/resources/data-events-runtime-api.md` for the complete function reference.

## Error Handling

| Status | Meaning | Common cause |
|--------|---------|-------------|
| 401 | Unauthorized | Bad or missing API token |
| 404 | Not found | Wrong ID, missing `.json` suffix |
| 422 | Validation failed | Missing required fields, wrong field format, missing booleans |
| 429 | Rate limited | Too many requests — back off and retry |

## OpenAPI Spec

The full API spec (101 endpoints, 47 resources) is available at:
- `fulcrum-product-knowledge/resources/fulcrum-rest-api.json` (vendored)
- `https://raw.githubusercontent.com/fulcrumapp/api/v2/reference/rest-api.json` (live)

## What This Skill Does NOT Cover

- **MCP-based building** — use `fulcrum-app-builder` with an MCP connector instead
- **Webhooks setup** — see the REST API reference
- **Query API** — SQL-based data access, separate authentication
- **Bulk operations** — batch API for large record sets
