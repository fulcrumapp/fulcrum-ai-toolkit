// Source: https://docs.fulcrumapp.com/docs/data-events-reference
// Purpose: append a repeatable child entry when a hyperlink field is tapped.

ON('click', 'create_a_repeatable', function (event) {
  var formValues = {};
  formValues[FIELD('repeatable_number').key] = $repeatable_field ? $repeatable_field.length : 0;

  var reps = $repeatable_field
    ? $repeatable_field.concat([{ form_values: formValues }])
    : [{ form_values: formValues }];

  CONFIG().results.push({
    type: 'set-value',
    key: FIELD('repeatable_field').key,
    value: JSON.stringify(reps)
  });
});
