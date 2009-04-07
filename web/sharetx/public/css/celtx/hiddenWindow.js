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

var gController = {
  observe: function (subject, topic, data) {
    if (topic == "celtx:recent-projects-changed")
      rebuildRecentProjectsMenu();
  }
};

function loaded() {
  gApp.init();
  window.controllers.appendController(gApp);

  window.tryToClose = tryToClose;

  var obsvc = getObserverService();
  obsvc.addObserver(gController, "celtx:recent-projects-changed", false);
}


function tryToClose () {
  var obsvc = getObserverService();
  obsvc.removeObserver(gController, "celtx:recent-projects-changed");
  window.controllers.removeController(gApp);
  return true;
}
