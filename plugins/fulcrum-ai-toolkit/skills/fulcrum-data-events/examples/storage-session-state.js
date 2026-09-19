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
// Saved records use one unique key per editing session. Each stored value
// includes the same nonce used in its key, so concurrent editors never share a
// key and cleanup cannot delete another editor's baseline. Completed lifecycle
// callbacks remove the session key; a host that can interrupt callbacks should
// provide an ephemeral session store or a retention policy for stale keys.
//
// New records have no RECORDID(), so their baseline stays in this editing
// session's memory instead of creating an unbounded persistent draft-key
// collection. The session nonce names an owner rather than a secret; Date.now()
// and Math.random() are sufficient for this purpose.
//
// Events used below are the documented record lifecycle: load-record fires when
// the editor is displayed, cancel-record fires after an editing session is
// cancelled, and unload-record fires when the editor has closed.
//
// Only list explicitly approved, non-sensitive scalar fields here. Do not
// replace this allowlist with DATANAMES(): STORAGE() is persistent and
// repeatable, media, location, and personal-data values do not belong in it.

var BASELINE_KEY_PREFIX = 'baseline:';
var BASELINE_FIELDS = ['condition', 'status'];
var MAX_BASELINE_TEXT_LENGTH = 256;
var baselineKey = null;
var baselineOwner = null;
var baselineValue = null;

function formScope() {
  return BASELINE_KEY_PREFIX + FORM().id;
}

function sessionNonce() {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

// Every saved baseline is stamped with this editing session's owner, so
// reopening the same saved record overwrites any prior session's baseline.
function baselineStorageKey() {
  var recordId = RECORDID();

  return recordId
    ? formScope() + ':record:' + recordId + ':session:' + baselineOwner
    : null;
}

function parseStoredEnvelope(stored) {
  try {
    return JSON.parse(stored);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return null;
    }
    throw error;
  }
}

function readBaseline() {
  if (baselineValue !== null) {
    return baselineValue;
  }

  if (!baselineKey) {
    return null;
  }

  var storage = STORAGE();
  var stored = storage.getItem(baselineKey);

  if (!stored) {
    return null;
  }

  var envelope = parseStoredEnvelope(stored);
  if (!envelope || envelope.owner !== baselineOwner) {
    return null;
  }

  baselineValue = envelope.value;
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

  var storage = STORAGE();
  var baseline = computeBaseline();
  baselineValue = baseline;

  if (baselineKey) {
    storage.setItem(
      baselineKey,
      JSON.stringify({ owner: baselineOwner, value: baseline })
    );
  }

  return baseline;
}

// Idempotent: this session has an exclusive storage key.
function clearBaseline() {
  if (baselineKey) {
    STORAGE().removeItem(baselineKey);
  }

  baselineKey = null;
  baselineOwner = null;
  baselineValue = null;
}

ON('load-record', function (event) {
  baselineOwner = sessionNonce();
  baselineKey = baselineStorageKey();
  ensureBaseline();
});

ON('cancel-record', function (event) {
  clearBaseline();
});

ON('unload-record', function (event) {
  clearBaseline();
});
