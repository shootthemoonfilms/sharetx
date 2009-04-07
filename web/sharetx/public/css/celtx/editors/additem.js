var gWindow = new Object();

function loaded () {
  gWindow.config    = window.arguments[0];
  gWindow.itemlist  = document.getElementById("itemlist");

  var rdfsvc = Components.classes["@mozilla.org/rdf/rdf-service;1"]
    .getService(Components.interfaces.nsIRDFService);
  var typearc = rdfsvc.GetResource(
    "http://www.w3.org/1999/02/22-rdf-syntax-ns#type");
  var titlearc = rdfsvc.GetResource("http://purl.org/dc/elements/1.1/title");
  var catres = rdfsvc.GetResource(gWindow.config.category);
  var items = gWindow.config.project.ds.GetSources(typearc, catres, true);
  while (items.hasMoreElements()) {
    var item = items.getNext().QueryInterface(
      Components.interfaces.nsIRDFResource);
    var title = gWindow.config.project.ds.GetTarget(item, titlearc, true);
    if (! title)
      continue;
    title = title.QueryInterface(Components.interfaces.nsIRDFLiteral).Value;
    gWindow.itemlist.appendItem(title, item.Value);
  }
}

function accepted () {
  var item = gWindow.itemlist.selectedItem;
  if (item) {
    gWindow.config.resource = item.value;
  }
  else {
    gWindow.config.title = gWindow.itemlist.label;
  }
  gWindow.config.accepted = true;
  return true;
}

function canceled () {
  return true;
}

function selected () {
}
