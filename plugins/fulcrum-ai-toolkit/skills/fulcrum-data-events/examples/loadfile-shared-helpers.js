// Source: https://docs.fulcrumapp.com/docs/data-events-loadfile
// Purpose: reuse one JavaScript helper file across several apps.
// LOADFILE({ name, form_name | form_id, variable }, callback) reads a Reference
// File attached to a form. `name` is required; `form_name` or `form_id` selects
// the owning form; `variable` names the loaded module on the callback data.
// Requires an Elite plan or Developer Pack.

ON('load-record', function (event) {
  LOADFILE({
    name: 'shared-helpers.js',
    form_id: FORM().id,
    variable: 'sharedHelpers'
  }, function (error, data) {
    if (error) {
      ALERT('Shared helpers unavailable', error.message || String(error));
      return;
    }

    var result = data.sharedHelpers.mySharedFunction($some_field);
    SETVALUE('computed_field', result);
  });
});
