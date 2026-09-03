// Source: https://docs.fulcrumapp.com/docs/data-events-reference
// Purpose: show a dependent field only when a choice answer selects it.
// Prefer the app designer's visibility rules when they can express the rule.

ON('change', 'permit_required', function (event) {
  SETHIDDEN('permit_number', CHOICEVALUE($permit_required) !== 'Yes');
});
