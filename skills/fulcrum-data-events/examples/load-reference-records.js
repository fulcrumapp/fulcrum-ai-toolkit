// Source: https://docs.fulcrumapp.com/docs/data-events-reference
// Purpose: read reference records asynchronously.
// LOADRECORDS() takes an options object and a callback; it does not return
// records directly. Verify availability against current pricing, the public
// function documentation, and the organization's permissions/configuration.
//
// Configure this with the ID of the separate reference form. FORM().id is the
// app containing this script, not a lookup form, unless that is intentional.
var REFERENCE_FORM_ID = 'replace-with-reference-form-id';

ON('load-record', function (event) {
  LOADRECORDS({
    form_id: REFERENCE_FORM_ID,
    limit: 200
  }, function (error, result) {
    if (error) {
      ALERT('Reference data unavailable', error.message || String(error));
      return;
    }

    var records = result.records;
    // Use loaded records to populate choices or validate input.
  });
});
