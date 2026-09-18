// Source: https://docs.fulcrumapp.com/docs/data-events-reference
// Source: https://docs.fulcrumapp.com/docs/data-events-setchoices
// Purpose: narrow one choice field's options from another field's answer.
// COUNTIES_BY_STATE is a plain object defined elsewhere in the same script, or
// loaded from a Reference File; see loadfile-shared-helpers.js.
//
// Without initialization the dependent field shows its full designed option
// list until the controlling field changes: default values do not fire change
// events on new records, and reopening a saved record fires no change event
// for a state that was chosen in an earlier session. Apply the filter once
// when the editing session starts as well.
//
// applyCountyChoices() is idempotent: it recomputes the option list from the
// current state answer and replaces it with SETCHOICES(), so running it on
// new-record, on edit-record, and on every change converges on the same list.

function applyCountyChoices() {
  var counties = COUNTIES_BY_STATE[CHOICEVALUE($state)];

  SETCHOICES('county', counties || []);
}

// new-record and edit-record are the documented initialization events: both
// fire after load-record, new-record only for new records and edit-record only
// when an existing record is opened.
ON('new-record', function (event) {
  applyCountyChoices();
});

ON('edit-record', function (event) {
  applyCountyChoices();
});

ON('change', 'state', function (event) {
  applyCountyChoices();
});
