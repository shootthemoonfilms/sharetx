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

var gWindow;
var gDelegate = null;

function loaded () {
  gWindow = new Object;
}


function setDelegate (delegate) {
  gDelegate = delegate;
}


function ltnNewCalendar () {
  if (gDelegate) gDelegate.ltnNewCalendar();
}


function ltnEditSelectedCalendar () {
  if (gDelegate) gDelegate.ltnEditSelectedCalendar();
}


function ltnDeleteSelectedCalendar () {
  if (gDelegate) gDelegate.ltnDeleteSelectedCalendar();
}


// no-op in ltn.js
function selectedCalendarPane (event) {}


function ltnSidebarCalendarSelected (tree) {
  if (gDelegate) gDelegate.ltnSidebarCalendarSelected(tree);
}

var ltnCalendarTreeView = {
  onDoubleClick: function onDoubleClick (event) {
    if (gDelegate) gDelegate.ltnCalendarTreeView.onDoubleClick(event);
  }
};


function ltnMinimonthPick (minimonth) {
  if (gDelegate) gDelegate.ltnMinimonthPick(minimonth);
}


function ltnGoToDate()
{
    var goToDate = document.getElementById("ltnDateTextPicker");
    if (goToDate.value) {
        ltnMinimonthPick(goToDate);
    }
}


var agendaTreeView = {
  onDoubleClick: function onDoubleClick(event) {
    if (gDelegate) gDelegate.agendaTreeView.onDoubleClick(event);
  }
};

function eventToTodo(event) {
  if (gDelegate) gDelegate.eventToTodo(event);
}

function editTodoItem(event) {
  if (gDelegate) gDelegate.editTodoItem(event);
}

function newTodoItem(event) {
  if (gDelegate) gDelegate.newTodoItem(event);
}

function deleteTodoItem(event) {
  if (gDelegate) gDelegate.deleteTodoItem(event);
}

function updateStyleSheetForCalendar(calendar) {
  if (gDelegate) gDelegate.updateStyleSheetForCalendar(calendar);
}
