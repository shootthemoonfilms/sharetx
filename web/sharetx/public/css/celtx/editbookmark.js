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
  gDialog.title   = document.getElementById("bmtitle");
  gDialog.url     = document.getElementById("bmurl");
  gDialog.config = window.arguments[0];

  if (gDialog.config.title)
    gDialog.title.value = gDialog.config.title;
  if (gDialog.config.url)
    gDialog.url.value   = gDialog.config.url;
}

function accepted () {
  gDialog.config.accepted = true;
  gDialog.config.title    = gDialog.title.value;
  gDialog.config.url      = canonizeWebURL(gDialog.url.value);
  return true;
}

function canceled () {
  return true;
}

