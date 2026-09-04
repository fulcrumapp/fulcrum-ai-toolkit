// Source: https://docs.fulcrumapp.com/reference/forms-intro
// Purpose: the preservation-safe update call for an existing form.
// Send the complete composed elements tree, not a partial patch. Existing
// element and inline-choice keys must be copied through unchanged; App MCP
// rejects an update that replaces a known element key.
//
// Omit removed_element_keys when removedElementKeys is empty. Declare only the
// root key of an approved removed subtree, and never declare a key that is
// still present in elements.

var updatePayload = {
  id: formId,
  elements: composedElements
};

if (removedElementKeys.length > 0) {
  updatePayload.removed_element_keys = removedElementKeys;
}

fulcrum_forms_update(updatePayload);
