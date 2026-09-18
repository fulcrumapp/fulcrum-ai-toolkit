// Source: https://docs.fulcrumapp.com/docs/data-events-reference
// Purpose: apply a bulk field operation without a hardcoded field list.
// DATANAMES() returns the data names available in the current form scope.

/*
AVOID — breaks when fields are added, renamed, or the app is copied.
var fields = ['site_name', 'inspector_name', 'condition', 'notes', 'photo'];
fields.forEach(function (f) {
  SETREADONLY(f, true);
});
*/

// PREFER — same pattern with an explicit exclusion set.
DATANAMES().forEach(function (f) {
  if (f !== 'qc_status' && f !== 'qc_date') {
    SETREADONLY(f, true);
  }
});
