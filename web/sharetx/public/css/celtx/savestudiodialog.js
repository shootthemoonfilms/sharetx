var gDialog = {};

function loaded () {
  gDialog.config = window.arguments[0];
  gDialog.loadingdeck = document.getElementById("loadingdeck");
  gDialog.loadingmsg = document.getElementById("loadingmsg");
  gDialog.list = document.getElementById("projectlist");
  gDialog.title = document.getElementById("titlebox");

  var cxsvc = getCeltxService();

  // This should probably be a function of the Celtx Service component.
  var xhr = new XMLHttpRequest();
  xhr.open("GET", getCeltxService().workspaceURI + "/projects", true);
  xhr.setRequestHeader("Accept", "application/json");
  xhr.onload = function () { projectListReceived(xhr); };
  xhr.onerror = function () { projectListFailed(); };
  xhr.send(null);

  gDialog.title.value = gDialog.config.title;

  validate();
}


function projectListReceived (req) {
  if (req.status < 200 || req.status >= 300) {
    gDialog.loadingmsg.value = gApp.getText("UnexpectedErrorPrompt") + " "
      + req.statusText;
    return;
  }

  gDialog.projectList = JSON.parse(req.responseText);
  for (var i = 0; i < gDialog.projectList.length; ++i) {
    var project = gDialog.projectList[i];
    var item = document.createElementNS(Cx.NS_XUL, "listitem");
    item.setAttribute("value", project.id);
    item.setAttribute("writable", project.writable == 1 ? "true" : "false");
    var cells = [
      document.createElementNS(Cx.NS_XUL, "listcell"),
      document.createElementNS(Cx.NS_XUL, "listcell"),
      document.createElementNS(Cx.NS_XUL, "listcell"),
      document.createElementNS(Cx.NS_XUL, "listcell")
    ];
    cells[0].setAttribute("label", project.title);
    cells[1].setAttribute("label", project.owner);
    cells[2].setAttribute("label", project.created);
    cells[3].setAttribute("label", project.user);
    for (var j = 0; j < cells.length; ++j)
      item.appendChild(cells[j]);
    gDialog.list.appendChild(item);
  }
  gDialog.loadingdeck.selectedIndex = 1;

  // Trigger it to look for a matching project in the list
  titleChanged();
}


function projectListFailed () {
  gDialog.loadingmsg.value = gApp.getText("StudioContactFailed");
}


function itemSelected () {
  if (gDialog.suppressEvents)
    return;

  gDialog.suppressEvents = true;

  var item = gDialog.list.selectedItem;
  var title = item.firstChild.getAttribute("label");
  gDialog.title.value = title;

  validate();

  gDialog.suppressEvents = false;
}


function titleChanged () {
  if (gDialog.suppressEvents)
    return;

  gDialog.suppressEvents = true;

  var title = gDialog.title.value.toLocaleLowerCase();
  var item = gDialog.list.firstChild;
  while (item) {
    if (item.firstChild.getAttribute("label").toLocaleLowerCase() == title) {
      gDialog.list.selectedItem = item;
      gDialog.suppressEvents = false;
      validate();
      return;
    }
    item = item.nextSibling;
  }
  gDialog.list.clearSelection();

  validate();

  gDialog.suppressEvents = false;
}


function accepted () {
  gDialog.config.accepted = true;
  gDialog.config.title = gDialog.title.value;
  var item = gDialog.list.selectedItem;
  gDialog.config.wsref = item ? item.getAttribute("value") : null;
  return true;
}


function canceled () {
  gDialog.config.accepted = false;
  return true;
}


function validate () {
  var acceptbutton = document.documentElement.getButton("accept");
  if (! gDialog.projectList) {
    acceptbutton.disabled = true;
    return;
  }

  if (! gDialog.title.value) {
    acceptbutton.disabled = true;
    return;
  }

  gDialog.config.title = gDialog.title.value;

  var item = gDialog.list.selectedItem;
  if (item) {
    gDialog.config.wsref = getCeltxService().workspaceURI
      + "/project/" + item.getAttribute("value");
  }
  else {
    gDialog.config.wsref = null;
  }

  acceptbutton.disabled = false;
}
