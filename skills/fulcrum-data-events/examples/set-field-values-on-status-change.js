// Source: https://docs.fulcrumapp.com/docs/data-events-reference
// Purpose: stamp who changed a record's status and when.
// Paste into the form's single `script` value alongside existing handlers.

ON('change-status', function (event) {
  SETVALUE('status_date', new Date());
  SETVALUE('status_by', USERFULLNAME());
});
