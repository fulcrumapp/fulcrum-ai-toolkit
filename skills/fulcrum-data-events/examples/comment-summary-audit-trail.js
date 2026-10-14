// Source: https://docs.fulcrumapp.com/docs/data-events-reference
// Purpose: accumulate an append-only comment trail across edits.
// This is a convenience log, not an audit control. Use Fulcrum changesets and
// platform permissions when the trail must be tamper-evident.

function appendSummary(existing, entry) {
  var previous = typeof existing === 'string' ? existing : '';
  var separator = previous.length > 0 && previous.charAt(previous.length - 1) !== '\n'
    ? '\n'
    : '';

  return previous + separator + entry + '\n';
}

ON('save-record', function (event) {
  var name = USERFULLNAME();
  var time = TIMESTAMP();

  if ($additional_comments != null) {
    var entry = CONCAT(name, ' at ', time, ' : ', $additional_comments);
    SETVALUE('comment_summary', appendSummary($comment_summary, entry));
  }
});

ON('load-record', function (event) {
  SETVALUE('additional_comments', null);
});
