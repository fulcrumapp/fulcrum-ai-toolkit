// Source: https://docs.fulcrumapp.com/docs/data-events-reference
// Purpose: enforce completeness rules before a record can be saved.
// INVALID() may be called more than once; every message is surfaced.

ON('validate-record', function (event) {
  if ($status === 'complete' && !$inspector_signature) {
    INVALID('Inspector signature is required before marking as complete.');
  }

  if (!$photo_field || $photo_field.length < 2) {
    INVALID('At least 2 photos are required.');
  }
});
