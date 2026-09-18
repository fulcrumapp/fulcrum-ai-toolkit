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
    var aValue = Number(a.form_values[sortKey]);
    var bValue = Number(b.form_values[sortKey]);
    var aSortValue = Number.isFinite(aValue) ? aValue : Number.POSITIVE_INFINITY;
    var bSortValue = Number.isFinite(bValue) ? bValue : Number.POSITIVE_INFINITY;

    if (aSortValue === bSortValue) {
      return 0;
    }

    return aSortValue < bSortValue ? -1 : 1;
  });

  rawSetValue('repeatable', sorted);
});
