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


var gHeaderController = {
  QueryInterface: function QueryInterface (iid) {
    if (iid.equals(Components.interfaces.nsISupports) ||
        iid.equals(Components.interfaces.nsIObserver))
      return this;
    throw Components.results.NS_ERROR_NO_INTERFACE;
  },


  loaded: function loaded () {
    // this.frame = document.getElementById("titleframe");
    this.fields = [];
    var rows = document.getElementById("headerrows").childNodes;
    for (var i = 0; i < rows.length; ++i) {
      var fields = rows[i].childNodes;
      if (fields.length != 4) {
        dump("*** gHeaderController.loaded: Row children count != 4\n");
        continue;
      }
      this.fields.push({ name: fields[0].value, textbox: fields[1]});
      this.fields.push({ name: fields[2].value, textbox: fields[3]});
    }
  },


  onScriptLoad: function onScriptLoad () {
    var doc = gScriptController.editor.contentDocument;
    var metas = doc.documentElement.firstChild.getElementsByTagName("meta");
    for (var i = 0; i < metas.length; ++i) {
      if (metas[i].name != "CX.avHeader")
        continue;
      var index = (Number(metas[i].getAttribute("row")) - 1) * 2;
      if (metas[i].getAttribute("col") == "B")
        ++index;
      this.fields[index].textbox.value = metas[i].content;
    }
    this.save();
  },


  get modified () {
    return false;
  },


  open: function open (project, docres) {
  },


  close: function close () {
  },


  save: function save () {
    var doc = gScriptController.editor.contentDocument;
    var metas = doc.documentElement.firstChild.getElementsByTagName("meta");
    var metalist = [];
    var dups = [];
    for (var i = 0; i < metas.length; ++i) {
      if (metas[i].name != "CX.avHeader")
        continue;
      var index = (Number(metas[i].getAttribute("row")) - 1) * 2;
      if (metas[i].getAttribute("col") == "B")
        ++index;
      // Catch dups from previous erroneous code
      if (metalist[index])
        dups.push(metalist[index]);
      metalist[index] = metas[i];
    }
    while (metalist.length > this.fields.length) {
      var meta = metalist.pop();
      if (meta)
        meta.parentNode.removeChild(meta);
    }
    while (dups.length > 0) {
      var meta = dups.pop();
      meta.parentNode.removeChild(meta);
    }
    for (var i = 0; i < this.fields.length; ++i) {
      if (metalist.length <= i || ! metalist[i]) {
        metalist[i] = doc.createElement("meta");
        metalist[i].setAttribute("name", "CX.avHeader");
        doc.documentElement.firstChild.appendChild(metalist[i]);
      }
      if (i % 2 == 0) {
        metalist[i].setAttribute("row", i / 2 + 1);
        metalist[i].setAttribute("col", "A");
      }
      else {
        metalist[i].setAttribute("row", (i + 1) / 2);
        metalist[i].setAttribute("col", "B");
      }
      metalist[i].setAttribute("label", this.fields[i].name);
      metalist[i].content = this.fields[i].textbox.value;
    }
  },


  focus: function focus () {
    // this.frame.setAttribute("type", "content-primary");
    // gController.outlineView.showSceneNav();
  },


  blur: function blur () {
    // this.frame.setAttribute("type", "content");
  },


  commands: {
    "cmd-page-setup": 1,
    "cmd-print": 1,
    "cmd-print-preview": 1
  },


  supportsCommand: function supportsCommand (cmd) {
    return this.commands[cmd] == 1;
  },


  isCommandEnabled: function isCommandEnabled (cmd) {
    switch (cmd) {
      case "cmd-page-setup":
      case "cmd-print":
      case "cmd-print-preview":
        return false;
      default:
        return false;
    }
  },


  doCommand: function doCommand (cmd) {
    switch (cmd) {
      case "cmd-page-setup":
        PrintUtils.showPageSetup();
        break;
      case "cmd-print":
        PrintUtils.print();
        break;
      case "cmd-print-preview":
        dump("*** TODO: implement cmd-print-preview in pdf\n");
        break;
    }
  },


  updateCommands: function updateCommands () {
    for (var cmd in this.commands)
      goUpdateCommand(cmd);
  },


  // For PrintUtils support
  get browser () {
    // return this.frame;
    return null;
  }
};
