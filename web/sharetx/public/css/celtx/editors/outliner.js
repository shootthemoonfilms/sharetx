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

var kDefaultFontName = "Times";
var gLastFontName = kDefaultFontName;

var gController = {
  QueryInterface: function QueryInterface (iid) {
    if (iid.equals(Components.interfaces.nsISupports) ||
        iid.equals(Components.interfaces.nsISupportsWeakReference) ||
        iid.equals(Components.interfaces.nsIController) ||
        iid.equals(Components.interfaces.nsIObserver) ||
        iid.equals(Components.interfaces.nsIDOMEventListener) ||
        iid.equals(Components.interfaces.nsIClipboardDragDropHooks))
      return this;
    else
      throw Components.results.NS_NOINTERFACE;
  },


  openwindows: { findreplace: null, spellcheck: null },


  paperSize: "USLetter",

  commands: {
    "cmd-align-center": 1,
    "cmd-align-justify": 1,
    "cmd-align-left": 1,
    "cmd-align-right": 1,
    "cmd-check-spelling": 1,
    "cmd-decrease-indent": 1,
    "cmd-find": 1,
    "cmd-find-again": 1,
    "cmd-find-previous": 1,
    "cmd-font-decrease": 1,
    "cmd-font-face": 1,
    "cmd-font-increase": 1,
    "cmd-font-size": 1,
    "cmd-increase-indent": 1,
    "cmd-lowercase": 1,
    "cmd-page-setup": 1,
    "cmd-print": 1,
    "cmd-print-preview": 1,
    "cmd-replace": 1,
    "cmd-toggle-ol": 1,
    "cmd-toggle-ul": 1,
    "cmd-uppercase": 1,
    "cmd-get-modcount": 1
  },


  supportsCommand: function (cmd) {
    return this.commands[cmd] == 1;
  },


  isCommandEnabled: function (cmd) {
    switch (cmd) {
      case "cmd-print-preview":
        return ! gWindow.inPrintPreview;
      case "cmd-lowercase":
      case "cmd-uppercase":
        return gWindow.editor.editor.canCopy();
      case "cmd-find-again":
      case "cmd-find-previous":
        var find = gWindow.editor.editorElement.webBrowserFind;
        return find.searchString && find.searchString != "";
      default:
        return this.commands[cmd] == 1;
    }
  },


  doCommand: function (cmd) {
    switch (cmd) {
      case "cmd-uppercase":
        gWindow.editor.setSelectionToUpperCase();
        break;
      case "cmd-lowercase":
        gWindow.editor.setSelectionToLowerCase();
        break;
      case "cmd-toggle-ol":
        gWindow.editor.toggleOrderedList();
        break;
      case "cmd-toggle-ul":
        gWindow.editor.toggleUnorderedList();
        break;
      case "cmd-decrease-indent":
        gWindow.editor.decreaseIndentLevel();
        break;
      case "cmd-increase-indent":
        gWindow.editor.increaseIndentLevel();
        break;
      case "cmd-align-center":
      case "cmd-align-justify":
      case "cmd-align-left":
      case "cmd-align-right":
        var alignment = cmd.substring(10);
        gWindow.editor.setAlignment(alignment);
        break;
      case "cmd-check-spelling":
        this.checkSpelling();
        break;
      case "cmd-find":
      case "cmd-replace":
        this.cmdFindReplace(cmd == "cmd-replace");
        break;
      case "cmd-find-again":
      case "cmd-find-previous":
        this.cmdFindAgain(cmd);
        break;
      case "cmd-font-face":
        this.cmdFontFace();
        break;
      case "cmd-font-size":
        this.cmdFontSize();
        break;
      case "cmd-page-setup":
        PrintUtils.showPageSetup();
        this.setPaperSizeFromPrefs();
        break;
      case "cmd-print":
        gApp.resetPrintingPrefs(true); // Show page numbers
        gApp.setPrintMargins(0, 0, 0, 0);
        PrintUtils.print();
        break;
      case "cmd-print-preview":
        gApp.resetPrintingPrefs(true);
        gApp.setPrintMargins(0, 0, 0, 0);
        PrintUtils.printPreview(onEnterPrintPreview, onExitPrintPreview);
        break;
    }
  },


  updateCommands: function updateCommands () {
    for (var cmd in this.commands)
      goUpdateCommand(cmd);
    top.goUpdateCommand("cmd-print-preview");
  },


  get modified () {
    return gWindow.editor.editor.getModificationCount() > 0;
  },


  // nsITransactionListener implementation
  didBeginBatch: function (mgr, result) {},

  didDo: function (mgr, tx, result) {
    top.goUpdateUndoEditMenuItems();
  },

  didEndBatch: function (mgr, result) {
    top.goUpdateUndoEditMenuItems();
  },

  didMerge: function (mgr, toptx, mergetx, didMerge, result) {
    top.goUpdateUndoEditMenuItems();
  },

  didRedo: function (mgr, tx, result) {
    top.goUpdateUndoEditMenuItems();
  },

  didUndo: function (mgr, tx, result) {
    top.goUpdateUndoEditMenuItems();
  },

  willBeginBatch: function (mgr) {},
  willDo: function (mgr, tx) {},
  willEndBatch: function (mgr) {},
  willMerge: function (mgr, toptx, mergetx) {},
  willRedo: function (mgr, tx) {},
  willUndo: function (mgr, tx) {},


  handleEvent: function handleEvent (event) {
    switch (event.type) {
      case "scriptload":
        gWindow.editor.removeEventListener("scriptload", this, false);
        this._loaded = true;
        this.setPaperSizeFromPrefs();
        var ps = getPrefService().getBranch("celtx.spelling.");
        InlineSpellChecker.Init(gWindow.editor.editor,
          ps.getBoolPref("inline"));
        // this.updatePageConfig();
        gWindow.editor.editor.transactionManager.AddListener(this);
        gWindow.editor.addEventListener("formatchanged", this, false);
        break;
      case "formatchanged":
        this.updateStyleStates();
        break;
    }
  },


  updatePageConfig: function updatePageConfig () {
    var styles = gWindow.editor.contentDocument.documentElement
      .firstChild.getElementsByTagName("style");
    var pagestyle = null;
    for (var i = 0; i < styles.length; ++i) {
      if (styles[i].getAttribute("title") == "pagestyle") {
        pagestyle = styles[i];
        break;
      }
    }
    if (! pagestyle) {
      pagestyle = gWindow.editor.contentDocument.createElement("style");
      pagestyle.type = "text/css";
      pagestyle.setAttribute("title", "pagestyle");
      gWindow.editor.contentDocument.documentElement.firstChild
        .appendChild(pagestyle);
    }
    // Set the contents
    var viewer = gWindow.editor.editorElement.docShell.contentViewer
      .QueryInterface(Components.interfaces.nsIMarkupDocumentViewer);
    var width = this.paperSize == "USLetter" ? 500 : 483;
    var pwidth = this.paperSize == "USLetter" ? 7.5 : 7.26;
    width = Math.ceil(width * viewer.textZoom);
    var str = "\n@media screen { body {\n  width: " + width + "pt;\n} }\n\n";;
    var textnode = gWindow.editor.contentDocument.createTextNode(str);
    if (pagestyle.hasChildNodes())
      pagestyle.replaceChild(textnode, pagestyle.firstChild);
    else
      pagestyle.appendChild(textnode);
  },


  updateStyleStates: function updateStyleStates () {
    var mixed = { value: false };
    var first = { value: false };
    var any = { value: false };
    var all = { value: false };
    var fontAtom = getAtom("font");
    // Font face
    var face = gWindow.editor.editor.getFontFaceState(mixed);
    if (! mixed.value) {
      if (! face) {
        face = gLastFontName;
      }
      else {
        gLastFontName = face;
      }
      var facemenu = document.getElementById("fontFaceMenu");
      var menuitem = getItemByValue(facemenu, face);
      if (menuitem)
        facemenu.selectedItem = menuitem;
      else
        dump("--- couldn't find menu item for " + face + "\n");
    }
    // Font size
    /*
    var size = gWindow.editor.editor.getInlinePropertyWithAttrValue(fontAtom,
      "size", null, first, any, all);
    if (size && all.value) {
      var sizemenu = document.getElementById("fontSizeMenu");
      var menuitem = getItemByValue(sizemenu, size);
      if (menuitem)
        sizemenu.selectedItem = menuitem;
    }
    */
    // Font colour
    var colour = gWindow.editor.editor.getFontColorState(mixed);
    if (! mixed.value) {
      if (! colour)
        colour = "rgb(0, 0, 0)";
      document.getElementById("fontColourPicker").color = colour;
    }
    // Bold
    // Italic
    // Underline
    var styles = [ "bold", "italic", "underline", "strikethrough" ];
    try {
      for (var i = 0; i < styles.length; ++i) {
        var style = styles[i];
        var cmdParams = Components.classes[
          "@mozilla.org/embedcomp/command-params;1"]
          .createInstance(Components.interfaces.nsICommandParams);
        var dispatcher = document.commandDispatcher;
        var cmd = 'cmd_' + style;
        var ctl = dispatcher.getControllerForCommand(cmd);
        if (ctl && ctl.isCommandEnabled(cmd) &&
          (ctl instanceof Components.interfaces.nsICommandController)) {
          ctl.getCommandStateWithParams(cmd, cmdParams);
          if (cmdParams.getBooleanValue("state_all"))
            document.getElementById(cmd).setAttribute("state", "true");
          else
            document.getElementById(cmd).setAttribute("state", "false");
        }
      }
    }
    catch (ex) {
      dump("*** updateStyleStates: " + ex + "\n");
    }
  },


  onContextShowing: function onContextShowing (popup) {
    // if we have a mispelled word, show spellchecker context
    // menuitems as well as the usual context menu
    var spellCheckNoSuggestionsItem = document.getElementById(
      "spellCheckNoSuggestions");
    var word;
    var misspelledWordStatus = InlineSpellChecker.updateSuggestionsMenu(
      document.getElementById("outliner-context"),
      spellCheckNoSuggestionsItem, word);

    var hideSpellingItems = (misspelledWordStatus == kSpellNoMispelling);
    spellCheckNoSuggestionsItem.hidden = hideSpellingItems ||
      misspelledWordStatus != kSpellNoSuggestionsFound;
    document.getElementById('spellCheckAddToDictionary').hidden =
      hideSpellingItems;
    document.getElementById('spellCheckIgnoreWord').hidden = hideSpellingItems;
    document.getElementById('spellCheckAddSep').hidden = hideSpellingItems;
    document.getElementById('spellCheckSuggestionsSeparator').hidden =
      hideSpellingItems;

    goUpdateGlobalEditMenuItems();

    var countsep = document.getElementById("wordCountSep");
    var countitem = document.getElementById("wordCountItem");
    if (gWindow.editor.selection.isCollapsed) {
      countsep.hidden = true;
      countitem.hidden = true;
    }
    else {
      countsep.hidden = false;
      var pted = gWindow.editor.editor.QueryInterface(
        Components.interfaces.nsIPlaintextEditor);
      countitem.label = gApp.getText("WordsSelectedCount",
        [ pted.getSelectionWordCount(gWindow.editor.selection) ]);
      countitem.hidden = false;
    }
  },


  open: function open (project, docres) {
    this.project = project;
    this.docres = docres;

    var file = this.project.fileForResource(docres);
    
    gWindow.editor.addEventListener("scriptload", this, false);
    if (isReadableFile(file)) {
      gWindow.editor.load(fileToFileURL(file));
    }
    else {
      var rdfsvc = getRDFService();
      var doctypearc = rdfsvc.GetResource(Cx.NS_CX + "doctype");
      var doctype = this.project.ds.GetTarget(this.docres, doctypearc, true);
      doctype = doctype.QueryInterface(Components.interfaces.nsIRDFResource);
      if (doctype.Value == Cx.NS_CX + "OutlineDocument")
        gWindow.editor.load(Cx.CONTENT_PATH + "editors/outline_tmpl.html");
      else
        gWindow.editor.load(Cx.CONTENT_PATH + "editors/text_tmpl.html");
    }
  },


  save: function save () {
    var file = this.project.fileForResource(this.docres);

    if (! file) {
      file = this.project.projectFolder;
      file.append("outline-" + generateID(3) + ".html");
      file.createUnique(0, 0600);
      this.project.addFileToDocument(file, this.docres);
    }

    if (gWindow.editor.editor.documentCharacterSet != "UTF-8")
      gWindow.editor.editor.documentCharacterSet = "UTF-8";

    var persist = getWebBrowserPersist();
    var IPersist = Components.interfaces.nsIWebBrowserPersist;
    var doc = gWindow.editor.contentDocument;
    var IMeta = Components.interfaces.nsIDOMHTMLMetaElement;
    var metas = doc.documentElement.firstChild.getElementsByTagName("meta");
    var foundCTMeta = false;
    for (var i = 0; i < metas.length; ++i) {
      if (metas[i].httpEquiv == "Content-Type") {
        if (metas[i].content != "text/html; charset=UTF-8")
          metas[i].content = "text/html; charset=UTF-8";
        foundCTMeta = true;
        break;
      }
    }
    if (! foundCTMeta) {
      var meta = doc.createElement("meta");
      meta.setAttribute("http-equiv", "Content-Type");
      meta.setAttribute("content", "text/html; charset=UTF-8");
      doc.documentElement.firstChild.appendChild(meta);
    }

    // TODO: more output flags? see ComposerCommands.js
    var flags = IPersist.ENCODE_FLAGS_WRAP
              | IPersist.ENCODE_FLAGS_ENCODE_LATIN1_ENTITIES
              | IPersist.ENCODE_FLAGS_FORMATTED;
    var wrap = 80;

    // TODO: other flags?
    persist.persistFlags  = persist.persistFlags
                          | IPersist.PERSIST_FLAGS_NO_BASE_TAG_MODIFICATIONS
                          | IPersist.PERSIST_FLAGS_REPLACE_EXISTING_FILES
                          | IPersist.PERSIST_FLAGS_DONT_FIXUP_LINKS
                          | IPersist.PERSIST_FLAGS_DONT_CHANGE_FILENAMES
                          | IPersist.PERSIST_FLAGS_FIXUP_ORIGINAL_DOM;

    try {
      // Only "text/html" will use the nsHTMLContentSerializer, which strips
      // out _moz_dirty attributes and pretty prints the output.
      var outputType = "text/html";
      persist.saveDocument(doc, file, null, outputType, flags, wrap);
      gWindow.editor.editor.resetModificationCount();
    }
    catch (ex) {
      dump("*** outliner.save: " + ex + "\n");
    }
  },


  close: function () {
    // It's possible for the tab to load in the background, and never
    // actually load the script before it's closed.
    window.controllers.removeController(this);

    if (this._loaded) {
      gWindow.editor.editor.transactionManager.RemoveListener(this);
      gWindow.editor.removeEventListener("formatchanged", this, false);
      if (InlineSpellChecker.inlineSpellChecker &&
          InlineSpellChecker.inlineSpellChecker.enableRealTimeSpell)
        InlineSpellChecker.shutdown();
    }
  },


  focus: function () {
    gWindow.editor.setAttribute("type", "content-primary");
    setTimeout("gWindow.editor.editorElement.contentWindow.focus()", 0);
  },


  blur: function () {
    if (gWindow.inPrintPreview)
      PrintUtils.exitPrintPreview();
    gWindow.editor.setAttribute("type", "content");
    var openwin = this.openwindows.spellcheck;
    if (openwin && ! openwin.closed)
      openwin.close();
    openwin = this.openwindows.findreplace;
    if (openwin && ! openwin.closed)
      openwin.close();
  },


  checkSpelling: function () {
    gWindow.editor.editorElement.contentWindow.focus();

    var openwin = this.openwindows.spellcheck;
    if (openwin && ! openwin.closed) {
      openwin.focus();
      return;
    }

    this.openwindows.spellcheck =
      window.openDialog(Cx.CONTENT_PATH + "editors/spellcheck.xul",
                        "_blank",
                        "chrome,titlebar,dependent,centerscreen,dialog=no",
                        gWindow.editor.editor);
  },


  cmdFindReplace: function cmdFindReplace (showReplace) {
    gWindow.editor.editorElement.contentWindow.focus();

    var openwin = this.openwindows.findreplace;
    if (openwin && ! openwin.closed) {
      openwin.focus();
      return;
    }

    this.openwindows.findreplace =
      window.openDialog(Cx.CONTENT_PATH + "editors/findreplace.xul",
                        "_blank",
                        "chrome,titlebar,dependent,centerscreen,dialog=no",
                        gWindow.editor.editorElement.webBrowserFind,
                        gWindow.editor.editor, showReplace);
  },


  cmdFindAgain: function cmdFindAgain (cmd) {
    var backwards = cmd == "cmd-find-previous";

    try {
      var findInst = gWindow.editor.editorElement.webBrowserFind;
      var findSvc  = getFindService();
  
      findInst.findBackwards = findSvc.findBackwards ^ backwards;
      findInst.findNext();
      findInst.findBackwards = findSvc.findBackwards;
    }
    catch (ex) {
      dump("findAgain: " + ex + "\n");
    }
  },


  cmdTextColour: function cmdTextColour (colour) {
    gWindow.editor.setColour(colour);
  },


  cmdFontFace: function cmdFontFace () {
    var face = document.getElementById("fontFaceMenu").value;
    var fontAtom = getAtom("font");
    gWindow.editor.editor.setInlineProperty(fontAtom, "face", face);
    gWindow.editor.contentWindow.focus();
  },


  cmdFontSize: function cmdFontSize () {
    var size = document.getElementById("fontSizeMenu").value;
    var fontAtom = getAtom("font");
    gWindow.editor.editor.setInlineProperty(fontAtom, "size", size);
  },


  decreaseFontSize: function decreaseFontSize () {
    gWindow.editor.editor.decreaseFontSize();
  },


  increaseFontSize: function increaseFontSize () {
    gWindow.editor.editor.increaseFontSize();
  },


  setZoom: function setZoom (zoom) {
    var viewer = gWindow.editor.editorElement.docShell.contentViewer
      .QueryInterface(Components.interfaces.nsIMarkupDocumentViewer);
    viewer.textZoom = zoom / 100.0;
    this.updatePageConfig();
  },


  setPaperSize: function setPaperSize (size) {
    this.paperSize = size;
    this.updatePageConfig();
  },


  setPaperSizeFromPrefs: function setPaperSizeFromPrefs () {
    var settings = PrintUtils.getPrintSettings();
    var width = settings.paperWidth;
    var height = settings.paperHeight;
    if (settings.paperSizeUnit == settings.kPaperSizeMillimeters) {
      width = width / 2.54;
      height = height / 2.54;
    }
    if (width > 8.4 && width < 8.6 && height > 10.9 && height < 11.1)
      this.setPaperSize("USLetter");
    else
      this.setPaperSize("A4");
  }
};


function loaded () {
  gWindow = new Object;

  gWindow.editor  = document.getElementById("editor");
  gWindow.toolbar = document.getElementById("outliner-toolbar");

  gWindow.fontmenu = document.getElementById("fontFaceMenu");

  // From mozilla/editor/ui/composer/content/editor.js
  var popup = gWindow.fontmenu.firstChild;
  try {
    var enumerator = Components.classes["@mozilla.org/gfx/fontenumerator;1"]
      .getService(Components.interfaces.nsIFontEnumerator);
    var localFontCount = { value: 0 };
    gWindow.localFonts = enumerator.EnumerateAllFonts(localFontCount);
  }
  catch (ex) {}
  for (var i = 0; i < gWindow.localFonts.length; ++i) {
    if (gWindow.localFonts[i] != "") {
      var item = document.createElementNS(Cx.NS_XUL, "menuitem");
      item.setAttribute("label", gWindow.localFonts[i]);
      item.setAttribute("value", gWindow.localFonts[i]);
      popup.appendChild(item);
      // The default
      if (gWindow.localFonts[i] == kDefaultFontName)
        gWindow.fontmenu.selectedItem = item;
    }
  }

  window.controllers.appendController(gController);
}


function onEnterPrintPreview () {
  gWindow.toolbar.hidden = true;
  gWindow.inPrintPreview = true;
  /*
  var printPreviewTB = document.createElementNS(XUL_NS, "toolbar");
  printPreviewTB.setAttribute("printpreview", true);
  printPreviewTB.setAttribute("id", "print-preview-toolbar");
  getBrowser().parentNode.insertBefore(printPreviewTB, getBrowser());
  */
  getBrowser().contentWindow.focus();
  gController.updateCommands();
}


function onExitPrintPreview () {
  /*
  var printPreviewTB = document.getElementById("print-preview-toolbar");
  if (printPreviewTB)
    printPreviewTB.parentNode.removeChild(printPreviewTB);
  */
  gWindow.toolbar.hidden = false;
  gWindow.editor.editorElement.makeEditable("html", false);
  gWindow.inPrintPreview = false;
  gController.updateCommands();
}


function getController () {
  return gController;
}


function getBrowser () {
  return gWindow.editor;
}


function getPPBrowser () {
  return getBrowser();
}

function getNavToolbox () {
  if ("navtoolbox" in gController)
    return gController.navtoolbox;
  return getPPBrowser();
}

function getWebNavigation () {
  var browser = getBrowser();
  return browser ? browser.webNavigation : null;
}


const kSpellMaxNumSuggestions = 3;
const kSpellNoMispelling = -1;
const kSpellNoSuggestionsFound = 0;

var InlineSpellChecker = {
  editor: null,
  inlineSpellChecker: null,

  Init: function (editor, enable) {
    // gWindow.editor = editor;
    this.inlineSpellChecker = editor.getInlineSpellChecker(true);

    var ps = getPrefService();
    var branch = ps.getBranch("celtx.spelling.");
    ps = ps.QueryInterface(Components.interfaces.nsIPrefBranch2);
    ps.addObserver("celtx.spelling.", this, false);

    this.inlineSpellChecker.enableRealTimeSpell = branch.getBoolPref("inline");
    if (this.inlineSpellChecker.enableRealTimeSpell)
      this.inlineSpellChecker.spellChecker.GetPersonalDictionary();
  },

  shutdown: function () {
    if ("@mozilla.org/spellchecker;1" in Components.classes) {
      var curLang = this.inlineSpellChecker.spellChecker.GetCurrentDictionary();
      var spellChecker = Components.classes[
        "@mozilla.org/spellchecker/myspell;1"].getService(
        Components.interfaces.mozISpellCheckingEngine);
      spellChecker.dictionary = curLang;
    }
    this.inlineSpellChecker.spellChecker.UninitSpellChecker();
    var ps = getPrefService();
    ps = ps.QueryInterface(Components.interfaces.nsIPrefBranch2);
    ps.removeObserver("celtx.spelling.", this, false);
  },

  observe: function (subject, topic, data) {
    if (topic != "nsPref:changed" || data != "celtx.spelling.inline")
      return;

    var ps = getPrefService().getBranch("celtx.spelling.");
    if (ps.getBoolPref("inline")) {
      this.inlineSpellChecker.enableRealTimeSpell = true;
      this.inlineSpellChecker.spellChecker.GetPersonalDictionary();
    }
    else {
      this.inlineSpellChecker.enableRealTimeSpell = false;
    }
  },

  checkDocument: function (doc) {
    if (! (this.inlineSpellChecker &&
           this.inlineSpellChecker.enableRealTimeSpell))
      return;

    var range = doc.createRange();
    range.selectNodeContents(doc.body);
    this.inlineSpellChecker.spellCheckRange(range);
  },

  getMispelledWord: function () {
    if (! (this.inlineSpellChecker &&
           this.inlineSpellChecker.enableRealTimeSpell))
      return null;

    var selection = gWindow.editor.selection;
    return this.inlineSpellChecker.getMispelledWord(
      selection.anchorNode, selection.anchorOffset);
  },

  // returns kSpellNoMispelling if the word is spelled correctly
  // For mispelled words, returns kSpellNoSuggestionsFound when there are no
  // suggestions otherwise the number of suggestions is returned.
  // firstNonWordMenuItem is the first element in the menu popup that isn't
  // a dynamically added word added by updateSuggestionsMenu.
  updateSuggestionsMenu: function (menupopup, firstNonWordMenuItem, word) {
    if (! (this.inlineSpellChecker &&
           this.inlineSpellChecker.enableRealTimeSpell))
      return kSpellNoMispelling;

    var child = menupopup.firstChild;
    while (child != firstNonWordMenuItem) {
      var next = child.nextSibling;
      menupopup.removeChild(child);
      child = next;
    }

    if (! word) {
      word = this.getMispelledWord();
      if (! word)
        return kSpellNoMispelling;
    }

    var spellChecker = this.inlineSpellChecker.spellChecker;
    if (! spellChecker)
      return kSpellNoMispelling;

    var numSuggestedWords = 0;

    var isIncorrect = spellChecker.CheckCurrentWord(word.toString());
    if (isIncorrect) {
      do {
        var suggestion = spellChecker.GetSuggestedWord();
        if (! suggestion)
          break;

        var item = document.createElement("menuitem");
        item.setAttribute("label", suggestion);
        item.setAttribute("value", suggestion);

        item.setAttribute("oncommand", "InlineSpellChecker.selectSuggestion"
                          + "(event.target.value, null, null);");
        menupopup.insertBefore(item, firstNonWordMenuItem);
        numSuggestedWords++;
      } while (numSuggestedWords < kSpellMaxNumSuggestions);
    }
    else
      numSuggestedWords = kSpellNoMispelling;

    return numSuggestedWords;
  },

  selectSuggestion: function (newword, node, offset) {
    if (! (this.inlineSpellChecker &&
           this.inlineSpellChecker.enableRealTimeSpell))
      return;

    if (! node) {
      var selection = gWindow.editor.selection;
      node = selection.anchorNode;
      offset = selection.anchorOffset;
    }

    this.inlineSpellChecker.replaceWord(node, offset, newword);
  },

  addToDictionary: function (node, offset) {
    if (! (this.inlineSpellChecker &&
           this.inlineSpellChecker.enableRealTimeSpell))
      return;

    if (! node) {
      var selection = gWindow.editor.selection;
      node = selection.anchorNode;
      offset = selection.anchorOffset;
    }

    var word = this.inlineSpellChecker.getMispelledWord(node,offset);
    if (word) this.inlineSpellChecker.addWordToDictionary(word);
  },

  ignoreWord: function (node, offset) {
    if (! (this.inlineSpellChecker &&
           this.inlineSpellChecker.enableRealTimeSpell))
      return;

    if (! node) {
      var selection = gWindow.editor.selection;
      node = selection.anchorNode;
      offset = selection.anchorOffset;
    }

    var word = this.inlineSpellChecker.getMispelledWord(node, offset);
    if (word)
      this.inlineSpellChecker.ignoreWord(word);
  }
};
