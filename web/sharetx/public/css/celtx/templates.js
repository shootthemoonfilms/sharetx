/*
var gWindow = new Object();
var gSelectedItem = null;


function loaded () {
  gWindow.openbutton    = document.getElementById("openbutton");

  populateTemplates();
  // populateRecentProjects();

  document.getElementById("notifier").setAttribute("src",
    Cx.STARTUP_URL + '/' + Cx.VERSION);
}


function accept () {
  if (! gSelectedItem) {
    dump("*** accept: No selected item\n");
    return;
  }

  var spec = gSelectedItem.getAttribute("value");
  window.openDialog(Cx.CONTENT_PATH, "_blank", Cx.NEW_WINDOW_FLAGS, spec);
  setTimeout("close()", 0);
}


function templateClicked (event) {
  var node = event.target;
  while (node) {
    if (node.className == "projectitem")
      break;
    node = node.parentNode;
  }
  if (node == gSelectedItem)
    return;
  if (gSelectedItem)
    gSelectedItem.removeAttribute("selected");
  if (node) {
    gSelectedItem = node;
    gSelectedItem.setAttribute("selected", "true");
    gWindow.openbutton.disabled = false;
  }
  else {
    gSelectedItem = null;
    gWindow.openbutton.disabled = true;
  }
}


function templateDblClicked (event) {
  if (gSelectedItem)
    accept();
}


function populateRecentProjects () {
  var rdfsvc = getRDFService();
  var titlearc = rdfsvc.GetResource(Cx.NS_DC + "title");
  var projects = gProjMgr.recentProjects.toArray();
  var rows = document.getElementById("recentrows");
  var row = null;
  for (var i = 0; i < projects.length; i++) {
    var proj = projects[i].QueryInterface(Components.interfaces.nsIRDFResource);
    var title = getRDFString(gProjMgr.ds, proj, titlearc);
    if (title) {
      var item = document.createElement("vbox");
      item.setAttribute("class", "projectitem");
      item.setAttribute("align", "center");
      item.setAttribute("value", proj.Value);
      var image = document.createElement("image");
      image.setAttribute("src", "chrome://celtx/skin/celtx.png");
      item.appendChild(image);
      var label = document.createElement("description");
      label.setAttribute("class", "header");
      label.setAttribute("crop", "end");
      label.appendChild(document.createTextNode(title));
      item.appendChild(label);

      if (! row || row.childNodes.length >= 4) {
        row = document.createElement("row");
        rows.appendChild(row);
      }
      row.appendChild(item);
    }
  }
  while (row.childNodes.length < 4)
    row.appendChild(document.createElement("label"));
}


function populateTemplates () {
  var tmpllist = getTemplateList();
  var tmpldir = currentProfileDir();
  tmpldir.append("CeltxTemplates");
  tmpldir = fileToFileURL(tmpldir);
  if (tmpldir.charAt(tmpldir.length - 1) != '/')
    tmpldir += '/';
  var rows = document.getElementById("templaterows");
  var row = null;
  for (var i = 0; i < tmpllist.length; ++i) {
    var info = null;
    try {
      info = getTemplateInfo(tmpllist[i]);
    }
    catch (ex) {
      dump("*** getTemplateInfo failed for " + tmpllist[i].leafName
        + ": " + ex + "\n");
      continue;
    }
    var item = document.createElement("vbox");
    item.setAttribute("class", "projectitem");
    item.setAttribute("align", "center");
    item.setAttribute("value", info.fileuri);
    var image = document.createElement("image");
    if (info.iconuri)
      image.setAttribute("src", tmpldir + info.iconuri);
    else
      image.setAttribute("src", "chrome://celtx/skin/celtx.png");
    item.appendChild(image);
    var label = document.createElement("description");
    label.setAttribute("class", "header");
    label.setAttribute("crop", "end");
    label.appendChild(document.createTextNode(info.title));
    item.appendChild(label);

    if (! row || row.childNodes.length >= 4) {
      row = document.createElement("row");
      rows.appendChild(row);
    }
    // gWindow.listbox.appendChild(item);
    row.appendChild(item);
  }
  while (row.childNodes.length < 4)
    row.appendChild(document.createElement("label"));
}
*/


function getTemplateList () {
  var IFile = Components.interfaces.nsIFile;
  var list = [];
  var tmpldir = currentProfileDir();
  tmpldir.append(Cx.TEMPLATES_DIR);
  if (tmpldir.exists() && tmpldir.isDirectory()) {
    var files = tmpldir.directoryEntries;
    while (files.hasMoreElements()) {
      var file = files.getNext().QueryInterface(IFile);
      if (! file.isDirectory() && file.leafName.match(/\.t?celtx$/))
        list.push(file);
    }
  }
  return list.sort(function (a, b) {
    return a.leafName.localeCompare(b.leafName);
  });
}


function getSampleList () {
  var IFile = Components.interfaces.nsIFile;
  var list = [];
  var sampledir = currentProfileDir();
  sampledir.append(Cx.SAMPLES_DIR);
  if (sampledir.exists() && sampledir.isDirectory()) {
    var files = sampledir.directoryEntries;
    while (files.hasMoreElements()) {
      var file = files.getNext().QueryInterface(IFile);
      if (! file.isDirectory() && file.leafName.match(/\.t?celtx$/))
        list.push(file);
    }
  }
  return list.sort(function (a, b) {
    return a.leafName.localeCompare(b.leafName);
  });
}


function getTemplateInfo (file) {
  var reader = getZipReader();
  reader.open(file);
  var entry = reader.getEntry(Cx.PROJECT_FILE);
  if (! entry)
    throw "No " + Cx.PROJECT_FILE + " in template";
  var tmprdf = tempFile("rdf");
  reader.extract(Cx.PROJECT_FILE, tmprdf);
  var rdfsvc = getRDFService();
  var ds = rdfsvc.GetDataSourceBlocking(fileToFileURL(tmprdf));
  var typearc = rdfsvc.GetResource(Cx.NS_RDF + "type");
  var titlearc = rdfsvc.GetResource(Cx.NS_DC + "title");
  var descarc = rdfsvc.GetResource(Cx.NS_DC + "description");
  var iconarc = rdfsvc.GetResource(Cx.NS_CX + "icon");
  var projecttype = rdfsvc.GetResource(Cx.NS_CX + "Project");
  var projres = ds.GetSource(typearc, projecttype, true);
  if (! projres) {
    dump("*** getTemplateInfo: No cx:Project in " + file.leafName + "\n");
    return null;
  }
  var iconname = getRDFString(ds, projres, iconarc);
  var iconfile = null;
  if (iconname) {
    iconfile = currentProfileDir();
    iconfile.append(Cx.TEMPLATES_DIR);
    iconfile.append(iconname);
  }
  var info = {
    title: getRDFString(ds, projres, titlearc),
    description: getRDFString(ds, projres, descarc),
    fileuri: fileToFileURL(file),
    iconuri: iconfile ? fileToFileURL(iconfile) : null
  };
  tmprdf.remove(true);
  return info;
}
