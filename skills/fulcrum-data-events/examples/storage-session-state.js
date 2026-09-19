// Source: https://docs.fulcrumapp.com/docs/data-events-storage
// Source: https://docs.fulcrumapp.com/docs/data-events-reference
// Source: https://docs.fulcrumapp.com/docs/data-events-loadrecords
// Source: https://docs.fulcrumapp.com/docs/app-extensions-introduction
// Purpose: cache a bounded baseline for one saved record's editing session.
//
// STORAGE() returns a local-storage-like object with getItem, setItem,
// removeItem, and clear. That store is device-wide and persistent, so every
// key below is scoped to the form and saved record. Never place credentials
// or personal data in storage.
//
// RECORDID() is null until a new record has been saved. Saved records use one
// stable key so the baseline survives a recreated script context and does not
// create one persistent key per edit. Unsaved records have no stable storage
// scope, so baselineValue keeps their value in the current editor session
// without writing an unscoped persistent key.
//
// Persistent entries expire after 30 minutes without a callback that reloads
// the context. This bounds stale data after an interrupted session. STORAGE()
// has no session identifier, so a new edit opened within that window cannot be
// distinguished from context recreation; use a host-specific session store
// when exact concurrent-session isolation is required.
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
var BASELINE_TTL_MS = 30 * 60 * 1000;
var baselineKey = null;
var baselineValue = null;

function baselineStorageKey() {
  var recordId = RECORDID();

  return recordId
    ? BASELINE_KEY_PREFIX + FORM().id + ':record:' + recordId
    : null;
}

function parseStoredBaseline(stored) {
  try {
    var parsed = JSON.parse(stored);

    return parsed &&
      parsed.value &&
      typeof parsed.value === 'object' &&
      !Array.isArray(parsed.value) &&
      Number.isFinite(parsed.expiresAt) &&
      parsed.expiresAt > Date.now()
      ? parsed.value
      : null;
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

  var stored = STORAGE().getItem(baselineKey);

  if (!stored) {
    return null;
  }

  baselineValue = parseStoredBaseline(stored);

  if (baselineValue === null) {
    STORAGE().removeItem(baselineKey);
    return null;
  }

  STORAGE().setItem(
    baselineKey,
    JSON.stringify({
      value: baselineValue,
      expiresAt: Date.now() + BASELINE_TTL_MS
    })
  );

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

// Idempotent: repeated calls within the current editor session reuse the
// cached value, including for unsaved records.
function ensureBaseline() {
  var existing = readBaseline();

  if (existing !== null) {
    return existing;
  }

  var baseline = computeBaseline();

  baselineValue = baseline;

  if (baselineKey) {
    STORAGE().setItem(
      baselineKey,
      JSON.stringify({
        value: baseline,
        expiresAt: Date.now() + BASELINE_TTL_MS
      })
    );
  }

  return baseline;
}

// Idempotent: saved records use one stable scoped key; unsaved records remain
// in session-scoped memory because RECORDID() is not available yet.
function clearBaseline() {
  var key = baselineKey || baselineStorageKey();

  if (key) {
    STORAGE().removeItem(key);
  }

  baselineKey = null;
  baselineValue = null;
}

ON('load-record', function (event) {
  baselineValue = null;
  baselineKey = baselineStorageKey();
  ensureBaseline();
});

ON('cancel-record', function (event) {
  clearBaseline();
});

ON('unload-record', function (event) {
  clearBaseline();
});
