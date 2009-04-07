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
 * Portions created by Chad House are Copyright (C) 2000-2005 Chad House,
 * parts created by Celtx are Copyright (C) 4067479 Canada Inc. All Rights
 * Reserved.
 * 
 * Contributor(s):
 *
 ***** END LICENCE BLOCK ***** */

var session = {};

function loaded () {
    // session = window.arguments[0];
    // session.responder.win = window;
    // session.channel.asyncOpen(session.receiver, null);
  session.listener = window.arguments[0];
  dump("--- loaded!\n");
  setTimeout("checkComplete()", 100);
}

function checkComplete () {
  if (! session.listener.complete) {
    setTimeout("checkComplete()", 100);
    return;
  }
  if (session.listener.channel.requestSucceeded)
    window.close();
}

function canceled () {
    // session.responder.canceled = true;
    session.listener.canceled = true;
    return true;
}

