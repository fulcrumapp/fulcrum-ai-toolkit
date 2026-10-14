// Source: https://docs.fulcrumapp.com/docs/data-events-request
// Purpose: show why a data event is not a place for a credential.
// Data Events run on-device and in-browser, so anyone who can open the app
// configuration can read the script. Fulcrum has no secret store for scripts.

function handleResponse(error, response, body) {
  if (error) {
    ALERT('Request failed: ' + INSPECT(error));
    return;
  }

  if (response) {
    INSPECT(response);
  }
}

/*
AVOID — an inline key is readable by every viewer of the script.
var API_KEY = '<api-key>';
REQUEST({ url: 'https://api.example.com/data?key=' + API_KEY }, handleResponse);
*/

// PREFER — call a middleware endpoint that holds the credential server-side,
// and never use a client-side script as an authorization boundary.
REQUEST({ url: 'https://middleware.example.com/lookup' }, handleResponse);
