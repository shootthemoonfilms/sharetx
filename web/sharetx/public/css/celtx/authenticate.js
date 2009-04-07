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


var dialog = {};


function loaded () {
  dialog.auth       = window.arguments[0];
  dialog.sb         = document.getElementById('celtx-bundle');
  dialog.username   = document.getElementById('username');
  dialog.password   = document.getElementById('password');
  dialog.autologin  = document.getElementById('auto-login-checkbox');

  var pref = getPrefService().getBranch("celtx.");

  dialog.username.value = dialog.auth.username || "";
  if (! dialog.username.value) {
    try {
      dialog.username.value = pref.getCharPref("user.id");
    }
    catch (ex) {}
  }
  try {
    dialog.password.value = base64_decodew(
      pref.getCharPref("user.encpassword"));
    
  }
  catch (ex) {}
  if (dialog.username.value != "")
    dialog.password.focus();
  if (dialog.auth.reattempt) {
    var msg = document.getElementById("msgfield");
    var link = document.getElementById("msglink");

    if (dialog.auth.message.match(/FAIL/i))
      msg.appendChild(document.createTextNode(msg.getAttribute("failvalue")));
    else
      msg.appendChild(document.createTextNode(dialog.auth.message));

    if (dialog.auth.location) {
      link.setAttribute("src", dialog.auth.location);
      link.value = link.getAttribute("enabledvalue");
    }
    else {
      link.value = "";
    }
  }

  try {
    dialog.autologin.checked = pref.getBoolPref("user.loginOnStartup");
  }
  catch (ex) {}
}


function recoverPassword () {
  // TODO: Update when the Studio link is ready
  gApp.openBrowser(getCeltxService().STUDIO_BASEURL + "/reset");
}


function createAccount () {
  // TODO: Update when the Studio link is ready
  gApp.openBrowser(getCeltxService().STUDIO_BASEURL + "/");
}


function canceled () {
  dialog.auth.canceled = true;
}


function accepted () {
  // Trim leading and trailing white space
  var username = dialog.username.value;
  username = username.replace(/^\s+/, "");
  username = username.replace(/\s+$/, "");
  dialog.auth.username = username;
  dialog.auth.password = dialog.password.value;
  var pref = getPrefService().getBranch("celtx.");
  try {
    pref.setBoolPref("user.loginOnStartup", dialog.autologin.checked);
  }
  catch (ex) {}
  if (dialog.autologin.checked) {
    pref.setCharPref("user.id", username);
    pref.setCharPref("user.encpassword", base64_encodew(dialog.password.value));
  }
  else {
    try {
      pref.clearUserPref("user.encpassword");
    }
    catch (ex) {}
  }
}
