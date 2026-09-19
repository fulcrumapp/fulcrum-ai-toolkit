// Source: https://docs.fulcrumapp.com/docs/data-events-reference
// Purpose: accumulate an append-only comment trail across edits.
// This is a convenience log, not an audit control. Use Fulcrum changesets and
// platform permissions when the trail must be tamper-evident.

var MAX_SUMMARY_CHARS = 2000;

function appendSummary(existing, entry) {
  var lines = typeof existing === 'string' ? existing.split('\n') : [];

  if (lines.length && lines[lines.length - 1] === '') {
    lines.pop();
  }

  lines.push(entry);

  while (lines.length > 1 && lines.join('\n').length + 1 > MAX_SUMMARY_CHARS) {
    lines.shift();
  }

  return lines.join('\n').slice(0, MAX_SUMMARY_CHARS - 1) + '\n';
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
