// Source: https://docs.fulcrumapp.com/docs/data-events-storage
// Source: https://docs.fulcrumapp.com/docs/data-events-reference
// Source: https://docs.fulcrumapp.com/docs/data-events-loadrecords
// Source: https://docs.fulcrumapp.com/docs/app-extensions-introduction
// Purpose: cache a derived baseline for one record's editing session.
//
// STORAGE() returns a local-storage-like object with getItem, setItem,
// removeItem, and clear. That store is device-wide and persistent, so a bare
// key such as 'baseline' is read back in the next record and a value derived
// from one record leaks into another. Values must be strings, so serialize
// objects. Never place credentials or personal data in storage.
//
// Two documented identifiers scope the record portion of the key:
//
//   FORM().id  identifies the app, so two apps on one device cannot share an
//              entry even when both run this script.
//   RECORDID() identifies the record, and is null until a new record has been
//              saved. That null is what a record identifier alone cannot
//              solve: every unsaved record answers the same way, so one
//              unsaved record reads back the previous unsaved record's
//              baseline.
//
// A nonce generated once per editing session scopes the cache entry for both
// saved and unsaved records. A session that crashed before its cleanup ran
// leaves behind a key the next session never computes, and a key that is never
// computed is never read: the stale value is unreachable immediately, not
// merely deleted later. The nonce names a cache entry rather than guarding
// one, so Date.now() and Math.random() are the right tools; the value is not a
// secret and nothing here treats it as one.
//
// Unreachable is not the same as reclaimed, and a crashed session cannot run
// its own cleanup. Each session records its draft key under one fixed pointer
// per app, and the next session removes whatever that pointer names before
// starting, so at most one abandoned entry per app survives a crash and it is
// removed without being read.
//
// Events used below are the documented record lifecycle: load-record fires when
// the editor is displayed, cancel-record fires after an editing session is
// cancelled, and unload-record fires when the editor has closed.
//
// Only list explicitly approved, non-sensitive scalar fields here. Do not
// replace this allowlist with DATANAMES(): STORAGE() is persistent and
// repeatable, media, location, and personal-data values do not belong in it.

var BASELINE_KEY_PREFIX = 'baseline:';
var SESSION_POINTER_SUFFIX = ':session-latest';
var BASELINE_FIELDS = ['condition', 'status'];
var MAX_BASELINE_TEXT_LENGTH = 256;
var baselineKey = null;

function formScope() {
  return BASELINE_KEY_PREFIX + FORM().id;
}

function sessionPointerKey() {
  return formScope() + SESSION_POINTER_SUFFIX;
}

function sessionNonce() {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

// Every baseline is named by this editing session, so reopening the same saved
// record cannot reuse a baseline left by an interrupted prior session.
function baselineStorageKey() {
  var recordId = RECORDID();

  return recordId
    ? formScope() + ':record:' + recordId + ':session:' + sessionNonce()
    : formScope() + ':draft:' + sessionNonce();
}

function readBaseline() {
  if (!baselineKey) {
    return null;
  }

  var storage = STORAGE();
  var stored = storage.getItem(baselineKey);

  if (!stored) {
    return null;
  }

  try {
    return JSON.parse(stored);
  } catch (error) {
    storage.removeItem(baselineKey);
    return null;
  }
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

  var storage = STORAGE();
  var baseline = computeBaseline();
  storage.setItem(baselineKey, JSON.stringify(baseline));

  return baseline;
}

// Removes the entry a previous session abandoned, without reading it: it was
// derived from a different editing session and means nothing here.
function discardAbandonedSession() {
  var storage = STORAGE();
  var abandoned = storage.getItem(sessionPointerKey());

  if (abandoned) {
    storage.removeItem(abandoned);
    storage.removeItem(sessionPointerKey());
  }
}

// Idempotent: removeItem on an absent key is a no-op.
function clearBaseline() {
  if (!baselineKey) {
    return;
  }

  var storage = STORAGE();
  storage.removeItem(baselineKey);

  if (storage.getItem(sessionPointerKey()) === baselineKey) {
    storage.removeItem(sessionPointerKey());
  }

  baselineKey = null;
}

ON('load-record', function (event) {
  discardAbandonedSession();
  baselineKey = baselineStorageKey();
  STORAGE().setItem(sessionPointerKey(), baselineKey);

  ensureBaseline();
});

ON('cancel-record', function (event) {
  clearBaseline();
});

ON('unload-record', function (event) {
  clearBaseline();
});
