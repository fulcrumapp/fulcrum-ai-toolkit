// Source: https://docs.fulcrumapp.com/docs/data-events-reference
// Purpose: narrow one choice field's options from another field's answer.
// COUNTIES_BY_STATE is a plain object defined elsewhere in the same script, or
// loaded from a Reference File; see loadfile-shared-helpers.js.

ON('change', 'state', function (event) {
  var counties = COUNTIES_BY_STATE[CHOICEVALUE($state)];
  SETCHOICES('county', counties || []);
});
