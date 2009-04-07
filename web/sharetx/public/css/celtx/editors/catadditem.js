var gDialog = new Object();

function loaded () {
  gDialog.config = window.arguments[0];

  gDialog.list = document.getElementById("deptlist");
  gDialog.name = document.getElementById("namebox");

  var rdfsvc = getRDFService();
  var rdfsrc = currentProfileDir();
  rdfsrc.append(Cx.PREFS_FILE);
  var prefds = rdfsvc.GetDataSourceBlocking(fileToFileURL(rdfsrc));
  gDialog.list.database.AddDataSource(prefds);
  gDialog.list.builder.rebuild();

  validate();

  setTimeout(selectDefaultCategory, 0);
}

function selectDefaultCategory () {
  setTimeout(function () { gDialog.name.focus(); }, 0);

  if (! gDialog.config.department) {
    gDialog.list.selectedIndex = 0;
    return;
  }

  var items = gDialog.list.getElementsByTagName("listitem");
  for (var i = 0; i < items.length; ++i) {
    if (items[i].value == gDialog.config.department) {
      gDialog.list.selectedItem = items[i];
      gDialog.list.ensureElementIsVisible(items[i]);
      return;
    }
  }

  gDialog.list.selectedIndex = 0;
}

function validate () {
  var valid = gDialog.name.value.match(/\S/);
  document.documentElement.getButton("accept").disabled = ! valid;
}

function accepted () {
  gDialog.config.title = gDialog.name.value;
  gDialog.config.department = gDialog.list.selectedItem.value;
  gDialog.config.accepted = true;
  return true;
}

function canceled () {
  gDialog.config.accepted = false;
  return true;
}
