// Source: https://docs.fulcrumapp.com/docs/app-extensions-introduction
// Purpose: read the OPENEXTENSION payload inside the extension HTML.
// Runs after the generated inline bootstrap. `payload.data` is exactly the
// object the Data Event passed as `data`; treat it as untrusted input and
// validate before using it.

Fulcrum.load(function (payload) {
  var data = payload.data || {};
  var currentValue = data.current_value;
  var recordId = data.record_id;

  initialize(currentValue, recordId);
});
