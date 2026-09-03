// Source: https://docs.fulcrumapp.com/docs/data-events-storage
// Purpose: cache a derived baseline for the current editing session.
// STORAGE() returns a local-storage-like object with getItem, setItem,
// removeItem, and clear. Values must be strings, so serialize objects.
// Never place credentials or personal data in storage.

ON('load-record', function (event) {
  var storage = STORAGE();
  if (!storage.getItem('baseline')) {
    storage.setItem('baseline', JSON.stringify(computeBaseline()));
  }

  var baseline = JSON.parse(storage.getItem('baseline'));
});
