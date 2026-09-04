// Source: https://docs.fulcrumapp.com/docs/app-extensions-introduction
// Purpose: minimal editor-pattern trigger.
// OPENEXTENSION takes an options object. A bare filename or positional string
// is not the supported contract.

ON('click', 'open_editor', function () {
  OPENEXTENSION({
    url: 'attachment://my-extension.html',
    title: 'My Extension',
    data: {
      current_value: VALUE('target_field')
    },
    onMessage: function (message) {
      var data = message && message.data;
      if (data) {
        SETVALUE('target_field', data.value);
      }
    }
  });
});
