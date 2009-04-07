/* ***** BEGIN LICENCE BLOCK *****
* Version: CePL 1.1
* 
* The contents of this file are subject to the Celtx Public License
* Version 1.1 (the "License"); you may not use this file except in
* compliance with the License. You may obtain a copy of the License at
* http://www.celtx.com/CePL/
* 
* Software distributed under the License is distributed on an "AS IS"
* basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See
* the License for the specific language governing rights and limitations
* under the License.
* 
* The Original Code is Celtx Script Manager.
* 
* The Initial Developer of the Original Code is Chad House and 4067479
* Canada Inc. t/a CELTX.
* 
* Portions created by Chad House are Copyright (C) 2000-2004 Chad House,
* parts created by Celtx are Copyright (C) 4067479 Canada Inc. All Rights
* Reserved.
* 
* Contributor(s):
*
***** END LICENCE BLOCK ***** */

var gDialog;
var kFolderImage = "chrome://celtx/skin/folder.png";

function loaded () {
  gDialog = new Object;
  gDialog.config        = window.arguments[0];
  gDialog.acceptButton  = document.documentElement.getButton("accept");
  gDialog.locationList  = document.getElementById("location-list");
  gDialog.titleBox      = document.getElementById("title-box");

  populateLocations(gDialog.config.project.rootFolder);

  gDialog.titleBox.focus();

  validate();
}

function populateLocations(parent, depth) {
  if (! depth)
    depth = 0;
  
  var rdfsvc = getRDFService();
  var cu = getRDFContainerUtils();
  var ds = parent.ds;
  var titleArc = rdfsvc.GetResource(Cx.NS_DC + "title");
  var title = ds.GetTarget(parent.res, titleArc, true);
  if (title && parent.res.Value != gDialog.config.project.rootFolder.res.Value)
    title = title.QueryInterface(Components.interfaces.nsIRDFLiteral).Value;
  else
    title = gDialog.config.project.title;
  
  var item = gDialog.locationList.appendItem(title, parent.res.Value);
  item.class = "menuitem-iconic";
  item.setAttribute("style", "margin-left: " + depth + "em;");
  item.setAttribute("image", kFolderImage);
  
  if (parent.res.Value == gDialog.config.location.Value)
    gDialog.locationList.selectedItem = item;
  
  var elems = parent.toArray();
  for (var i = 0; i < elems.length; i++) {
    if (cu.IsSeq(ds, elems[i]))
      populateLocations(new RDFSeq(ds, elems[i]), depth + 1);
  }
}

function accepted () {
  var rdfsvc = getRDFService();
  var location = gDialog.locationList.selectedItem.value;
  
  gDialog.config.accepted   = true;
  gDialog.config.title      = gDialog.titleBox.value;
  gDialog.config.location   = rdfsvc.GetResource(location);
  
  return true;
}

function canceled () {
  return true;
}

function validate () {
  if (gDialog.titleBox.value != "")
    gDialog.acceptButton.disabled = false;
  else
    gDialog.acceptButton.disabled = true;
}
