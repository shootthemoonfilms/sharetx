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


var gTitleController = {
  __proto__: EditorController.prototype,


  metamap: {
    "Author": "author",
    "DC.source": "source",
    "DC.rights": "rights",
    "CX.contact": "contact",
    "CX.byline": "byline"
  },


  QueryInterface: function QueryInterface (iid) {
    if (iid.equals(Components.interfaces.nsISupports) ||
        iid.equals(Components.interfaces.nsIObserver))
      return this;
    throw Components.results.NS_ERROR_NO_INTERFACE;
  },


  loaded: function loaded () {
    this.frame = document.getElementById("titleframe");
  },


  onScriptLoad: function onScriptLoad () {
    this.frame.setAttribute("src", Cx.CONTENT_PATH + "editors/titlepage.xhtml");
    setTimeout("gTitleController.populateTitlePage()", 100);
  },


  populateTitlePage: function populateTitlePage () {
    if (this.frame.docShell.busyFlags) {
      setTimeout("gTitleController.populateTitlePage()", 100);
      return;
    }

    var doc = this.frame.contentDocument;
    var script = gScriptController.editor.contentDocument;
    var head = script.documentElement.firstChild;
    var metas = head.getElementsByTagName("meta");

    for (var metaname in this.metamap) {
      var meta = null;
      for (var i = 0; i < metas.length; ++i) {
        if (metas[i].name == metaname) {
          meta = metas[i];
          break;
        }
      }
      if (! meta) {
        meta = script.createElement("meta");
        meta.name = metaname;
        head.appendChild(meta);
        if (metaname == "CX.byline")
          meta.content = gApp.getText("TitlePageBy");
      }
      try {
        doc.getElementById(this.metamap[metaname]).value = meta.content;
      }
      catch (ex) {
        dump("*** populateTitlePage [" + this.metamap[metaname] + "]: " + ex + "\n");
      }
    }
    doc.getElementById("title").value = script.title;
  },


  get modified () {
    var doc = this.frame.contentDocument;
    var script = gScriptController.editor.contentDocument;
    var head = script.documentElement.firstChild;
    var metas = head.getElementsByTagName("meta");
    for (var metaname in this.metamap) {
      for (var i = 0; i < metas.length; i++) {
        if (metas[i].name == metaname) {
          if (doc.getElementById(this.metamap[metaname]).value
              != metas[i].content)
            return true;
          break;
        }
      }
    }
    return doc.getElementById("title").value != script.title;
  },


  open: function open (project, docres) {
  },


  close: function close () {
  },


  save: function save () {
    var doc = this.frame.contentDocument;
    var script = gScriptController.editor.contentDocument;
    var head = script.documentElement.firstChild;
    var metas = head.getElementsByTagName("meta");
    for (var metaname in this.metamap) {
      for (var i = 0; i < metas.length; i++) {
        if (metas[i].name == metaname) {
          metas[i].content = doc.getElementById(this.metamap[metaname]).value;
          break;
        }
      }
    }
    gScriptController.editor.title = doc.getElementById("title").value;
  },


  init: function init () {
  },


  destroy: function destroy () {
  },


  focus: function focus () {
    this.frame.setAttribute("type", "content-primary");
    gController.outlineView.showSceneNav();
  },


  blur: function blur () {
    if (this.inPrintPreview)
      PrintUtils.exitPrintPreview();
    if (this.modified) {
      this.save();
      gScriptController.editor.editor.incrementModificationCount(1);
    }
    this.frame.setAttribute("type", "content");
  },


  commands: {
    "cmd-page-setup": 1,
    "cmd-print": 1,
    "cmd-print-preview": 1,
    "cmd-treeitem-delete": 1,
    "cmd-treeitem-down": 1,
    "cmd-treeitem-goto": 1,
    "cmd-treeitem-recycle": 1,
    "cmd-treeitem-up": 1
  },


  supportsCommand: function supportsCommand (cmd) {
    return this.commands[cmd] == 1;
  },


  isCommandEnabled: function isCommandEnabled (cmd) {
    switch (cmd) {
      case "cmd-page-setup":
      case "cmd-print":
      case "cmd-print-preview":
        return true;
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
        PrintUtils.printPreview(title_onEnterPrintPreview,
          title_onExitPrintPreview);
        break;
    }
  },


  updateCommands: function updateCommands () {
    for (var cmd in this.commands)
      goUpdateCommand(cmd);
  },


  // For PrintUtils support
  get browser () {
    return this.frame;
  }
};


function title_onEnterPrintPreview () {
  gTitleController.inPrintPreview = true;
  /*
  try {
    var printPreviewTB = document.createElementNS(XUL_NS, "toolbar");
    printPreviewTB.setAttribute("printpreview", true);
    printPreviewTB.setAttribute("id", "print-preview-toolbar");
    getBrowser().parentNode.insertBefore(printPreviewTB, getBrowser());
  }
  catch (ex) {
    dump("*** title_onEnterPrintPreview: " + ex + "\n");
  }
  */
  gController.updateCommands();
  getBrowser().contentWindow.focus();
}


function title_onExitPrintPreview () {
  /*
  try {
    var printPreviewTB = document.getElementById("print-preview-toolbar");
    if (printPreviewTB)
      printPreviewTB.parentNode.removeChild(printPreviewTB);
  }
  catch (ex) {
    dump("*** title_onExitPrintPreview: " + ex  + "\n");
  }
  */
  gTitleController.inPrintPreview = false;
  gController.updateCommands();
}
