# App Design Asset Index

Copyable templates for app schema work. Text assets carry a `# Source:`
comment. Strict JSON cannot hold comments, so its source is recorded here.

| File | What it holds | Public source |
| --- | --- | --- |
| [`calculation-field-expressions.txt`](calculation-field-expressions.txt) | Valid and invalid calculation-field expression forms. | [Fulcrum calculation function example](https://docs.fulcrumapp.com/docs/calculations-ref-concatenate) |
| [`required-boolean-errors.txt`](required-boolean-errors.txt) | The 422 messages returned when `required`, `hidden`, or `disabled` are omitted. | [Forms API introduction](https://docs.fulcrumapp.com/reference/forms-intro) |
| [`record-link-field.json`](record-link-field.json) | A minimal RecordLinkField element using `linked_form_id`. | [Forms API introduction](https://docs.fulcrumapp.com/reference/forms-intro) |

## Notes

- `record-link-field.json` uses `linked_form_id`, not `form_id` or
  `record_link_form_id`, and at least one of `allow_existing_records` or
  `allow_creating_records` must be `true`.
- Add `required`, `hidden`, and `disabled` as explicit booleans to any element
  sent to the Forms API, including this one.
- A form update requires the entire form object. Read the form first, modify
  the copied tree, then send it back complete.
