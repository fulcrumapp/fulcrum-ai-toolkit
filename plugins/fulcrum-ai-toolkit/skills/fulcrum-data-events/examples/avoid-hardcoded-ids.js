// Source: https://docs.fulcrumapp.com/docs/data-events-reference
// Purpose: keep an app portable by discovering resources at runtime.

// AVOID — a copied or re-created app gets different identifiers.
var TEMPLATE_ID = 'replace-with-a-discovered-id';

// PREFER — load records and match on a stable attribute instead of an ID.
LOADRECORDS({ form_id: FORM().id }, function (error, result) {
  var templates = error ? [] : result.records;
  // Match by name, type, or relationship, never by a literal identifier.
});
