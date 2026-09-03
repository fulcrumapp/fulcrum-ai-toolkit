// Source: https://docs.fulcrumapp.com/docs/data-events-storage
// Source: https://docs.fulcrumapp.com/docs/data-events-reference
// Source: https://docs.fulcrumapp.com/docs/app-extensions-introduction
// Purpose: cache a derived baseline for one record's editing session.
//
// STORAGE() returns a local-storage-like object with getItem, setItem,
// removeItem, and clear. That store is device-wide and persistent: a bare key
// such as 'baseline' is read back in the next record, so a value derived from
// one record leaks into another. Scope the key with an identifier that is
// stable for the session, and remove it when the session ends.
//
// RECORDID() is the documented record identifier passed to extensions; it is
// null until a new record has been saved, so a new record gets its own
// 'new-record' scope for the life of the editor.
//
// Events used below are the documented record lifecycle: load-record fires when
// the editor is displayed, cancel-record fires after an editing session is
// cancelled, and unload-record fires when the editor has closed. Values must be
// strings, so serialize objects. Never place credentials or personal data in
// storage.

var BASELINE_KEY_PREFIX = 'baseline:';
var baselineKey = null;

function baselineStorageKey() {
  return BASELINE_KEY_PREFIX + (RECORDID() || 'new-record');
}

function readBaseline() {
  if (!baselineKey) {
    return null;
  }

  var storage = STORAGE();
  var stored = storage.getItem(baselineKey);

  return stored ? JSON.parse(stored) : null;
}

// Idempotent: repeated calls within one session reuse the cached value.
function ensureBaseline() {
  var existing = readBaseline();

  if (existing) {
    return existing;
  }

  var storage = STORAGE();
  var baseline = computeBaseline();
  storage.setItem(baselineKey, JSON.stringify(baseline));

  return baseline;
}

// Idempotent: removeItem on an absent key is a no-op.
function clearBaseline() {
  if (baselineKey) {
    var storage = STORAGE();
    storage.removeItem(baselineKey);
    baselineKey = null;
  }
}

ON('load-record', function (event) {
  baselineKey = baselineStorageKey();
  ensureBaseline();
});

ON('cancel-record', function (event) {
  clearBaseline();
});

ON('unload-record', function (event) {
  clearBaseline();
});
