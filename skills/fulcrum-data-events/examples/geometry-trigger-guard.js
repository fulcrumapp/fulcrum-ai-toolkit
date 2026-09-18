// Source: https://docs.fulcrumapp.com/docs/data-events-reference
// Purpose: contrast an unsafe location trigger with a guarded one.
// A new record has no geometry until the user captures it, so new-record and
// load-record cannot assume LOCATION() is populated.

// AVOID — fires on new-record while geometry is still empty.
ON('new-record', function (event) {
  var loc = LOCATION();
  // loc is null here; reading loc.latitude throws.
  REQUEST({ url: 'https://api.example.com/weather?lat=' + loc.latitude }, handleWeather);
});

// PREFER — change-geometry fires only when a location is actually captured.
ON('change-geometry', function (event) {
  var loc = LOCATION();
  if (!loc) {
    return; // guard for programmatic geometry clears
  }

  REQUEST({
    url: 'https://api.example.com/weather?lat=' + loc.latitude + '&lon=' + loc.longitude
  }, handleWeather);
});
