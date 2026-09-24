# App Design Asset Index

Copyable templates for app schema work. Text assets carry a `# Source:`
comment. Strict JSON cannot hold comments, so its source is recorded here.

| File | What it holds | Public source |
| --- | --- | --- |
| [`calculation-field-expressions.txt`](calculation-field-expressions.txt) | Simple expressions, advanced JavaScript with `SETRESULT()`, required input fields, and the invalid top-level `return` form. | [Calculations Reference](https://docs.fulcrumapp.com/docs/calculations-reference), [Week Number](https://docs.fulcrumapp.com/docs/week-of-the-year) |
| [`required-boolean-errors.txt`](required-boolean-errors.txt) | The 422 messages returned when `required`, `hidden`, or `disabled` are omitted. | [Forms API introduction](https://docs.fulcrumapp.com/reference/forms-intro) |
| [`record-link-field.json`](record-link-field.json) | A complete RecordLinkField element with the common element properties and `form_id`. | [Forms API introduction](https://docs.fulcrumapp.com/reference/forms-intro) |

## Notes

- `record-link-field.json` is a complete element, not a fragment. Every
  property in it is defined by the Forms API contract in
  [fulcrumapp/api#93](https://github.com/fulcrumapp/api/pull/93), which matches
  the Rails `Form::RecordLinkField` element. `type`, `key`, `data_name`, and
  `label` are required for every element. `form_id` is required for a record
  link. `allow_existing_records`, `allow_creating_records`,
  `allow_updating_records`, `allow_multiple_records`,
  `record_conditions_type`, `record_conditions`, `record_defaults`, and
  `default_previous_value` are the RecordLink properties. There is no
  `linked_form_id` or `allow_empty_records` element attribute. Rails stores
  the target form's database id in `forms_links.linked_form_id`; that
  association column is not part of the element.
  Source: [Forms API introduction](https://docs.fulcrumapp.com/reference/forms-intro)
  and Rails `app/classes/form/record_link_field.rb`.
- `record-link-field.json` uses `form_id`, not `linked_form_id` or
  `record_link_form_id`. At least one of `allow_existing_records` or
  `allow_creating_records` must be `true`. The API does not default a missing
  allow flag. The example uses the form-builder values, which are not API
  defaults. Replace `form_id` with a real form resource id before sending.
- `key` is the element's unique four-character hex key within the form, and
  `form_id` is a form ID. Both values here are neutral placeholders;
  read the real values from the live form before sending an update.
- Add `required`, `hidden`, and `disabled` as explicit booleans to any element
  sent to the Forms API, including this one.
- A form update requires the entire form object. Read the form first, modify
  the copied tree, then send it back complete.
