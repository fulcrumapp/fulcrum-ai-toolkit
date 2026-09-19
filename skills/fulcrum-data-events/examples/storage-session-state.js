// Source: https://docs.fulcrumapp.com/docs/data-events-storage
// Source: https://docs.fulcrumapp.com/docs/data-events-reference
// Source: https://docs.fulcrumapp.com/docs/data-events-loadrecords
// Source: https://docs.fulcrumapp.com/docs/app-extensions-introduction
// Purpose: cache a derived baseline for one record's editing session.
//
// STORAGE() returns a local-storage-like object with getItem, setItem,
// removeItem, and clear. That store is device-wide and persistent, so it is
// not safe for an edit-session baseline: concurrent editors can race and an
// interrupted callback can leave an orphaned key. Keep this baseline in the
// script context instead. Never place credentials or personal data in storage.
//
// RECORDID() is null until a new record has been saved, but even a saved
// record identifier cannot scope state to one concurrent editing session.
// Script memory is the only state used below, so saved and unsaved records
// cannot read or remove one another's baselines.
//
// Events used below are the documented record lifecycle: load-record fires when
// the editor is displayed, cancel-record fires after an editing session is
// cancelled, and unload-record fires when the editor has closed.
//
// Only list explicitly approved, non-sensitive scalar fields here. Do not
// replace this allowlist with DATANAMES(): STORAGE() is persistent and
// repeatable, media, location, and personal-data values do not belong in it.

var BASELINE_FIELDS = ['condition', 'status'];
var MAX_BASELINE_TEXT_LENGTH = 256;
var baselineValue = null;

function readBaseline() {
  return baselineValue;
}

function computeBaseline() {
  var baseline = {};

  BASELINE_FIELDS.forEach(function (fieldName) {
    var value = VALUE(fieldName);

    if (typeof value === 'string' && value.length <= MAX_BASELINE_TEXT_LENGTH) {
      baseline[fieldName] = value;
    } else if (
      typeof value === 'number' &&
      Number.isFinite(value)
    ) {
      baseline[fieldName] = value;
    } else if (typeof value === 'boolean') {
      baseline[fieldName] = value;
    }
  });

  return baseline;
}

// Idempotent: repeated calls within one session reuse the cached value.
function ensureBaseline() {
  var existing = readBaseline();

  if (existing) {
    return existing;
  }

  var baseline = computeBaseline();
  baselineValue = baseline;

  return baseline;
}

// Idempotent: this session has an exclusive in-memory baseline.
function clearBaseline() {
  baselineValue = null;
}

ON('load-record', function (event) {
  ensureBaseline();
});

ON('cancel-record', function (event) {
  clearBaseline();
});

ON('unload-record', function (event) {
  clearBaseline();
});
