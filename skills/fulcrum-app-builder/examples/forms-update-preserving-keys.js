// Source: https://docs.fulcrumapp.com/reference/forms-intro
// Purpose: the preservation-safe update call for an existing form.
// Payload-only fragment, not a standalone workflow or write authorization.
// First follow ../SKILL.md#step-4-build-or-hand-off and
// ../resources/pre-write-freshness.md: review/approve, fresh-read/reconcile,
// revalidate, and reapprove material changes before using this payload.
// Send the complete composed elements tree, not a partial patch. Existing
// element keys, concrete element types, and inline-choice keys must be copied
// through unchanged; App MCP rejects an update that replaces a known element
// key. "Element" is a generic schema/model name, not a valid field type.
//
// Omit removed_element_keys when removedElementKeys is empty. Declare only the
// root key of an approved removed subtree, and never declare a key that is
// still present in elements.
// `form` is the fresh full form object from the immediately preceding read.
// Copy only writable FormBody fields; response-only metadata must not be
// forwarded to the update tool.

var updatePayload = {
  id: formId,
  name: form.name,
  elements: composedElements
};

for (var field of [
  'description',
  'status_field',
  'title_field_keys',
  'record_prefix',
  'geometry_types',
  'geometry_required',
  'script',
  'projects_enabled',
  'assignment_enabled',
  'auto_assign',
  'hidden_on_dashboard'
]) {
  if (Object.prototype.hasOwnProperty.call(form, field)) {
    updatePayload[field] = form[field];
  }
}

if (removedElementKeys.length > 0) {
  updatePayload.removed_element_keys = removedElementKeys;
}

fulcrum_forms_update(updatePayload);
