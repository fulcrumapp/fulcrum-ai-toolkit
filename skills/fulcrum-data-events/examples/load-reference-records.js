// Source: https://docs.fulcrumapp.com/docs/data-events-reference
// Purpose: read reference records asynchronously.
// LOADRECORDS() takes an options object and a callback; it does not return
// records directly. Verify availability against current pricing, the public
// function documentation, and the organization's permissions/configuration.

ON('load-record', function (event) {
  LOADRECORDS({
    form_id: FORM().id,
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
