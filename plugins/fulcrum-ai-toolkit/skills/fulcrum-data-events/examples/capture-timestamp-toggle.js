// Source: https://docs.fulcrumapp.com/docs/data-events-reference
// Purpose: write the current time into a text field from a choice toggle.

ON('change', 'capture_time', function (event) {
  var currentTimeField = 'time';

  if (event.value === 'capture') {
    var now = new Date();
    var hours = now.getHours().toString().padStart(2, '0');
    var minutes = now.getMinutes().toString().padStart(2, '0');
    var seconds = now.getSeconds().toString().padStart(2, '0');
    SETVALUE(currentTimeField, hours + ':' + minutes + ':' + seconds);
  } else if (event.value === 'reset') {
    SETVALUE(currentTimeField, '00:00:00');
  }
});
