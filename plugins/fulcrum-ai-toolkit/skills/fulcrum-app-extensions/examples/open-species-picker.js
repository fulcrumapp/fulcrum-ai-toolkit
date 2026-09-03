// Source: https://docs.fulcrumapp.com/docs/app-extensions-introduction
// Purpose: the picker pattern's trigger handler.
// The picker extension replaces the native picker UI, so the stored value
// belongs in a TextField (free-form result) or a RecordLinkField (selected
// record) — never in a ChoiceField, whose own picker conflicts with it.

ON('click', 'open_species_picker', function (event) {
  OPENEXTENSION({
    url: 'attachment://species_picker.html',
    title: 'Species picker',
    data: {
      current_value: VALUE('selected_species')
    },
    onMessage: function (message) {
      var data = message && message.data;
      if (data) {
        SETVALUE('selected_species', data.value);
      }
    }
  });
});
