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

  var runtime = Components.classes["@mozilla.org/xre/app-info;1"]
    .getService(Components.interfaces.nsIXULRuntime);
  var registry = Components.classes["@mozilla.org/chrome/chrome-registry;1"]
    .getService(Components.interfaces.nsIXULChromeRegistry);
  var textmsg = window.arguments[0];
  var ex = window.arguments[2];
  var headerstr = null;
  if (window.arguments.length > 3)
    headerstr = window.arguments[3];

  var description = document.getElementById("message");
  description.appendChild(document.createTextNode(textmsg));
  if (headerstr) {
    var header = document.createElementNS(Cx.NS_XUL, "label");
    header.setAttribute("class", "header");
    header.setAttribute("value", headerstr);
    description.parentNode.insertBefore(header, description);
  }
  var trace = "Celtx version: " + Cx.VERSION +
    "\nLocale: " + registry.getSelectedLocale("celtx") +
    "\nOS: " + runtime.OS + " " + runtime.XPCOMABI + "\n";
  if (ex)
    trace += "Exception: " + ex + "\n";
  trace += "\nStack:\n";
  var stack = window.arguments[1];
  while (stack) {
    trace += stack.toString() + "\n";
    stack = stack.caller;
  }
  document.getElementById("stacktrace").value = trace;
}

function accepted () {
  return true;
}

function reportBug () {
  gApp.openBrowser(Cx.BUG_REPORT_URL);
}

function showDetails () {
  var linkbox = document.getElementById("detailslinkbox");
  var detailsbox = document.getElementById("detailsbox");
  linkbox.collapsed = true;
  detailsbox.collapsed = false;
  window.sizeToContent();
}
