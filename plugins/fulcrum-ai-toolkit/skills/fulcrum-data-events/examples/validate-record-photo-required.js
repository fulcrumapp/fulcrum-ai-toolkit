// Source: https://docs.fulcrumapp.com/docs/data-events-reference
// Purpose: block save until a required photo exists.
// validate-record is synchronous; INVALID(message) stops the save.

ON('validate-record', function (event) {
  if (!$photo_field || $photo_field.length === 0) {
    INVALID('At least one photo is required');
  }
});
