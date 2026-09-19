// Source: https://docs.fulcrumapp.com/docs/app-extensions-introduction
// Purpose: read the OPENEXTENSION payload inside the extension HTML.
// Runs after the generated inline bootstrap. `payload.data` is exactly the
// object the Data Event passed as `data`; treat it as untrusted input and
// validate before using it.

Fulcrum.load(function (payload) {
  if (
    !payload ||
    typeof payload !== 'object' ||
    !payload.data ||
    typeof payload.data !== 'object' ||
    Array.isArray(payload.data)
  ) {
    console.error('Invalid extension payload: expected an object in data');
    return;
  }

  var data = payload.data;
  var currentValue = data.current_value;
  var recordId = data.record_id;
  if (currentValue === null || typeof currentValue === 'undefined') {
    currentValue = '';
  }
  if (recordId === null || typeof recordId === 'undefined') {
    recordId = null;
  }

  if (
    typeof currentValue !== 'string' ||
    currentValue.length > 256 ||
    (recordId !== null &&
      (typeof recordId !== 'string' ||
        recordId.length === 0 ||
        recordId.length > 128))
  ) {
    console.error('Invalid extension payload: unexpected value or identifier');
    return;
  }

  initialize(currentValue, recordId);
});
