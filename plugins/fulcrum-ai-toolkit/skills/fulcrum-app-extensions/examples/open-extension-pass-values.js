// Source: https://docs.fulcrumapp.com/docs/app-extensions-introduction
// Purpose: open an extension from a HyperlinkField and write the result back.
// This is the canonical OPENEXTENSION call for every "pass values in, read the
// result out" flow. `url` uses attachment://<file name> for HTML uploaded as a
// Reference File, and that file name must match the uploaded name exactly:
// species-picker.html here and in ../assets/app-mcp-extension-publish-sequence.txt.
// `onMessage` receives { data } from Fulcrum.finish().

ON('click', 'open_picker_btn', function () {
  OPENEXTENSION({
    url: 'attachment://species-picker.html',
    title: 'Species picker',
    data: {
      current_value: VALUE('species_name'),
      record_id: RECORDID(),
      mode: 'picker'
    },
    onMessage: function (message) {
      var data = message && message.data;
      if (data) {
        SETVALUE('species_name', data.value);
      }
    }
  });
});
