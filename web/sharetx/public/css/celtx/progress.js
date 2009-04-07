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
  gDialog.progress    = document.getElementById("progress-meter");
  gDialog.message     = document.getElementById("message-label");
  gDialog.controller  = window.arguments[0];

  window.setTimeout(nextTick, 0);
}


function canceled () {
  try {
    gDialog.controller.abort();
  }
  catch (ex) {}
  return true;
}


function nextTick () {
  gDialog.message.value = gDialog.controller.message;
  gDialog.progress.setAttribute("value", gDialog.controller.progress);
  if (gDialog.controller.finished) {
    window.close();
    return;
  }
  try {
    if (gDialog.controller.performNextTask()) {
      window.setTimeout(nextTick, 50);
    }
    else {
      gDialog.message.value = gDialog.controller.message;
      gDialog.progress.value = 0;
      window.close();
    }
  }
  catch (ex) {
    gDialog.exception = ex;
    gDialog.stack = Components.stack;
    dump("*** nextTick: " + ex + "\n");
    window.close();
  }
}
