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
var gCeltxSettings;

function loaded() {
  gDialog = new Object;

  gDialog.pageNumbers     = document.getElementById("pageNumbers");
  gDialog.firstPageNumber = document.getElementById("firstPageNumber");
  gDialog.sceneNumbers    = document.getElementById("sceneNumbers");
  gDialog.paperSize       = document.getElementById("paperSize");
  gDialog.charNumbers     = document.getElementById("charNumbers");
  gDialog.linesPerPage    = document.getElementById("linesPerPage");

  initSettings();
}

function initSettings() {
  gCeltxSettings = window.arguments[0];

  gDialog.paperSize.selectedItem =
    getItemByValue(gDialog.paperSize, gCeltxSettings.paperSize);

  gDialog.pageNumbers.checked       = gCeltxSettings.pageNumbers;
  gDialog.firstPageNumber.checked   = gCeltxSettings.firstPageNumber;
  gDialog.firstPageNumber.disabled  = ! gCeltxSettings.pageNumbers;
  gDialog.linesPerPage.disabled     = ! gCeltxSettings.pageNumbers;

  var ps = getPrefService().getBranch("celtx.script.");
  gDialog.linesPerPage.value = ps.getIntPref(
    gDialog.paperSize.value + ".lines");

  if (gCeltxSettings.sceneNumbers)
    gDialog.sceneNumbers.selectedItem =
      getItemByValue(gDialog.sceneNumbers, gCeltxSettings.sceneNumbers);
  gDialog.sceneNumbers.disabled     = gCeltxSettings.disableSceneNumbers;

  if (gCeltxSettings.showCharCheckbox) {
    gDialog.charNumbers.hidden  = false;
    gDialog.charNumbers.checked = gCeltxSettings.characterNumbers;
  }

  if (gCeltxSettings.hideSceneNumbers)
    document.getElementById("sceneNumberBox").collapsed = true;
  if (gCeltxSettings.hidePageNumbers)
    document.getElementById("pageNumberBox").collapsed = true;
}

function paperSizeChanged () {
  var ps = getPrefService().getBranch("celtx.script.");
  gDialog.linesPerPage.value = ps.getIntPref(
    gDialog.paperSize.value + ".lines");
}

function accepted (event) {
  var linesPerPage = Number(gDialog.linesPerPage.value);
  if (isNaN(linesPerPage) || linesPerPage < 40 || linesPerPage > 80) {
    gDialog.linesPerPage.value = gApp.getText("ValidLinesPerPage");
    if (event)
      event.preventDefault();
    return false;
  }
  gCeltxSettings.accepted         = true;
  gCeltxSettings.paperSize        = gDialog.paperSize.selectedItem.value;
  gCeltxSettings.pageNumbers      = gDialog.pageNumbers.checked;
  gCeltxSettings.firstPageNumber  = gDialog.firstPageNumber.checked;
  gCeltxSettings.sceneNumbers     = gDialog.sceneNumbers.selectedItem.value;

  var ps = getPrefService().getBranch("celtx.script.");
  ps.setIntPref(gDialog.paperSize.value + ".lines", linesPerPage);

  if (gCeltxSettings.showCharCheckbox)
    gCeltxSettings.characterNumbers = gDialog.charNumbers.checked;

  return true;
}

function canceled() {
  return true;
}
