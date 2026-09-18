// Source: https://docs.fulcrumapp.com/docs/data-events-reference
// Purpose: accumulate an append-only comment trail across edits.
// This is a convenience log, not an audit control. Use Fulcrum changesets and
// platform permissions when the trail must be tamper-evident.

ON('save-record', function (event) {
  var name = USERFULLNAME();
  var time = TIMESTAMP();

  if ($additional_comments != null && $comment_summary != null) {
    var temp = $comment_summary;
    SETVALUE('comment_summary', temp + CONCAT(name, ' at ', time, ' : ', $additional_comments, '\n'));
  } else if ($additional_comments != null && $comment_summary == null) {
    SETVALUE('comment_summary', CONCAT(name, ' at ', time, ' : ', $additional_comments, '\n'));
  }
});

ON('load-record', function (event) {
  SETVALUE('additional_comments', null);
});
