// Source: https://docs.fulcrumapp.com/docs/data-events-reference
// Source: https://docs.fulcrumapp.com/docs/data-events-sethidden
// Purpose: show a dependent field only when a choice answer selects it.
// Prefer the app designer's visibility rules when they can express the rule.
//
// A change handler alone is not enough. Default values do not fire change
// events on new records, and opening an existing record fires no change event
// either, so the dependent field keeps whatever visibility it was designed
// with until the user touches the controlling field. Apply the rule once at
// the start of the session as well.
//
// applyPermitVisibility() is idempotent: it derives the hidden state from the
// current answer and calls SETHIDDEN() with that state, so running it on
// new-record, on edit-record, and on every change converges on the same result.

function applyPermitVisibility() {
  SETHIDDEN('permit_number', CHOICEVALUE($permit_required) !== 'Yes');
}

// new-record and edit-record are the documented initialization events: both
// fire after load-record, new-record only for new records and edit-record only
// when an existing record is opened.
ON('new-record', function (event) {
  applyPermitVisibility();
});

ON('edit-record', function (event) {
  applyPermitVisibility();
});

ON('change', 'permit_required', function (event) {
  applyPermitVisibility();
});
