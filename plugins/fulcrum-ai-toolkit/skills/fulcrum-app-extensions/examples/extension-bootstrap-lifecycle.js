// Source: https://docs.fulcrumapp.com/docs/app-extensions-introduction
// Purpose: the load/finish lifecycle inside an extension page.
// Fulcrum.finish(result) closes the extension and delivers { data: result } to
// the Data Event's onMessage callback. It does not write form fields; the Data
// Event must call SETVALUE() or another supported function.
//
// The bridge is the only trusted channel. Do not add ad hoc window.postMessage
// listeners; if the extension embeds any other frame, verify event.origin and
// event.source against an expected value before trusting a message.

Fulcrum.load(function (payload) {
  initialize(payload.data || {});
});

function initialize(data) {
  // Populate the extension UI from data.
}

function saveAndClose(result) {
  Fulcrum.finish(result);
}
