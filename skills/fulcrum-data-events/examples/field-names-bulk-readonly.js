// Source: https://docs.fulcrumapp.com/docs/data-events-reference
// Purpose: apply a bulk field operation without a hardcoded field list.
// FIELD_NAMES() returns the data names in the current form scope; inside a
// repeatable event it returns that repeatable's fields.

// AVOID — breaks when fields are added, renamed, or the app is copied.
var fields = ['site_name', 'inspector_name', 'condition', 'notes', 'photo'];
fields.forEach(function (f) {
  SETREADONLY(f, true);
});

// PREFER — resolve the field list at runtime.
FIELD_NAMES().forEach(function (f) {
  SETREADONLY(f, true);
});

// PREFER — same pattern with an explicit exclusion set.
FIELD_NAMES().forEach(function (f) {
  if (f !== 'qc_status' && f !== 'qc_date') {
    SETREADONLY(f, true);
  }
});
