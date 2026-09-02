# Data Event Examples

> Source: https://docs.fulcrumapp.com/docs/data-events-reference.md
> Verified: 2026-09-02

## Capture Timestamp with Yes/No Toggle

Uses a Yes/No field to record the current time in HH:MM:SS format.

```javascript
ON('change', 'capture_time', function(event) {
  var currentTimeField = 'time';
  if (event.value === 'capture') {
    var now = new Date();
    var hours = now.getHours().toString().padStart(2, '0');
    var minutes = now.getMinutes().toString().padStart(2, '0');
    var seconds = now.getSeconds().toString().padStart(2, '0');
    var timeString = hours + ':' + minutes + ':' + seconds;
    SETVALUE(currentTimeField, timeString);
  } else if (event.value === 'reset') {
    SETVALUE(currentTimeField, '00:00:00');
  }
});
```

## Comment Summary (Audit Trail)

Accumulates user comments with timestamps across multiple edits.

```javascript
ON('save-record', function(event) {
  var name = USERFULLNAME();
  var time = TIMESTAMP();
  if ($additional_comments != null && $comment_summary != null) {
    var temp = $comment_summary;
    SETVALUE('comment_summary', temp + CONCAT(name, ' at ', time, ' : ', $additional_comments, '\n'));
  } else if ($additional_comments != null && $comment_summary == null) {
    SETVALUE('comment_summary', CONCAT(name, ' at ', time, ' : ', $additional_comments, '\n'));
  }
});

ON('load-record', function(event) {
  SETVALUE('additional_comments', null);
});
```

## Repeatable Record Sorting

Auto-sort child records in a repeatable by a numeric field.

```javascript
function rawSetValue(dataname, value) {
  const field_key = FIELD(dataname).key;
  var result = {
    type: "set-value",
    key: field_key,
    value: JSON.stringify(value)
  };
  CONFIG().results.push(result);
}

ON('change', 'repeatable', () => {
  let reps = $repeatable;
  let sorted = reps.sort((a, b) =>
    parseInt(a.form_values[FIELD('field_data_name').key]) >
    parseInt(b.form_values[FIELD('field_data_name').key]) ? 1 : -1
  );
  rawSetValue('repeatable', sorted);
});
```

**Note:** Record must be saved after repeatables are added before they can be edited.

## Create Repeatables Programmatically

Generate new repeatable entries via hyperlink click.

```javascript
ON('click', 'create_a_repeatable', () => {
  let form_values = {};
  form_values[FIELD('repeatable_number').key] = $repeatable_field ? $repeatable_field.length : 0;
  let reps = $repeatable_field ? [...$repeatable_field, {form_values}] : [{form_values}];
  CONFIG().results.push({
    type: 'set-value',
    key: FIELD('repeatable_field').key,
    value: JSON.stringify(reps)
  });
});
```

## Record Validation

Prevent save if required conditions aren't met.

```javascript
ON('validate-record', function(event) {
  if ($status === 'complete' && !$inspector_signature) {
    INVALID('Inspector signature is required before marking as complete.');
  }
  if ($photo_field && $photo_field.length < 2) {
    INVALID('At least 2 photos are required.');
  }
});
```

## Conditional Field Visibility via SETFORMATTRIBUTES

```javascript
ON('change', 'inspection_type', function(event) {
  if (event.value === 'detailed') {
    SETFORMATTRIBUTES({hidden: {'detailed_section': false}});
  } else {
    SETFORMATTRIBUTES({hidden: {'detailed_section': true}});
  }
});
```
