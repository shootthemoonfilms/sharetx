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

function loaded () {
  gDialog = new Object;

  gDialog.namebox         = document.getElementById("name-textbox");
  gDialog.locationimage   = document.getElementById("location-image");
  gDialog.locationbox     = document.getElementById("location-textbox");
  gDialog.acceptbutton    = document.documentElement.getButton("accept");

  gDialog.config = window.arguments[0];
  gDialog.namebox.value = gDialog.config.title;

  gDialog.locationimage.src = iconURLForFile(gDialog.config.location);

  validateInput();
}

function accepted () {
  gDialog.config.accepted = true;
  gDialog.config.title = gDialog.namebox.value;
  return true;
}

function canceled () {
  return true;
}

function validateInput () {
  gDialog.config.title = gDialog.namebox.value;
  var sep = isWin() ? "\\" : "/";
  var dirname = gDialog.config.location.leafName;
  var projname = sanitizeFilename(gDialog.config.title);
  gDialog.locationbox.value = dirname + sep + projname;
  var projfile = gDialog.config.location.clone();
  projfile.append(projname);
  gDialog.locationimage.setAttribute("tooltiptext", projfile.path);
  if (projname == "")
    gDialog.acceptbutton.disabled = true;
  else
    gDialog.acceptbutton.disabled = false;
}

function revealLocation () {
  gDialog.config.location.reveal();
}

function browse () {
  const IFP = Components.interfaces.nsIFilePicker;
  var fp = getFilePicker();
  fp.init(window, null, IFP.modeGetFolder);
  fp.appendFilters(IFP.filterAll);
  fp.displayDirectory = gDialog.config.location;
  if (fp.show() == IFP.returnCancel)
    return;
  gDialog.config.location = fp.file;
  gDialog.locationimage.src = iconURLForFile(gDialog.config.location);
  validateInput();
}
