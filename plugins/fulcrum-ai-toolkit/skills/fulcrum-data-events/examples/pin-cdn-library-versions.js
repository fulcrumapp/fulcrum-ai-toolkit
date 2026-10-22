// Source: https://docs.fulcrumapp.com/docs/data-events-reference
// Purpose: lock external script references to an exact version.
// An unversioned or "latest" URL changes under the app without a code change,
// and any external URL is unavailable offline.

// AVOID — unversioned references.
var unpinned = [
  '<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>',
  '<script src="https://cdnjs.cloudflare.com/ajax/libs/d3/latest/d3.min.js"></script>'
];

// PREFER — exact semver references, and inline or Reference File assets when
// the workflow must run offline.
var pinned = [
  '<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js"></script>',
  '<script src="https://cdnjs.cloudflare.com/ajax/libs/d3/7.9.0/d3.min.js"></script>'
];
