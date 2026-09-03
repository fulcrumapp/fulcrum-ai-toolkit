// Source: https://docs.fulcrumapp.com/docs/data-events-reference
// Purpose: order repeatable child entries by a numeric child field.
// Note: the record must be saved after repeatables are added before the child
// entries can be edited.

function rawSetValue(dataname, value) {
  var fieldKey = FIELD(dataname).key;
  CONFIG().results.push({
    type: 'set-value',
    key: fieldKey,
    value: JSON.stringify(value)
  });
}

ON('change', 'repeatable', function (event) {
  var reps = $repeatable || [];
  var sortKey = FIELD('field_data_name').key;
  var sorted = reps.slice().sort(function (a, b) {
    return parseInt(a.form_values[sortKey], 10) > parseInt(b.form_values[sortKey], 10) ? 1 : -1;
  });

  rawSetValue('repeatable', sorted);
});
