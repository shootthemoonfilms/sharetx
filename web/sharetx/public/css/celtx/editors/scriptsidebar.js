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

var gPanel = {
  QueryInterface: function QueryInterface (iid) {
    if (iid.equals(Components.interfaces.nsISupports) ||
        iid.equals(Components.interfaces.nsIController) ||
        iid.equals(Components.interfaces.nsIRDFObserver) ||
        iid.equals(Components.interfaces.nsIDOMEventListener))
      return this;
    throw Components.results.NS_ERROR_NOINTERFACE;
  },


  commands: {
    "cmd-sidebar-add-item": 1,
    "cmd-sidebar-remove-item": 1,
    "cmd-sidebar-find-chars": 1
  },


  supportsCommand: function supportsCommand (cmd) {
    return this.commands[cmd] == 1;
  },


  isCommandEnabled: function isCommandEnabled (cmd) {
    switch (cmd) {
      case "cmd-sidebar-add-item":
        return this.curscene != null;
      case "cmd-sidebar-remove-item":
        return ! this._locked && this.curscene != null &&
               this.treeview && this.treeview.selectedItem != null;
      case "cmd-sidebar-find-chars":
        return true;
      default:
        return false;
    }
  },


  doCommand: function doCommand (cmd) {
    switch (cmd) {
      case "cmd-sidebar-add-item":
        var box = document.getElementById("sidebaradditembox");
        if (box.collapsed)
          this.showAddBox();
        else
          this.hideAddBox();
        break;
      case "cmd-sidebar-remove-item":
        this.removeItem();
        break;
      case "cmd-sidebar-find-chars":
        this.findChars();
        break;
    }
  },


  updateCommands: function updateCommands () {
    for (var cmd in this.commands)
      goUpdateCommand(cmd);
  },


  _locked: false,


  lock: function () {
    this._locked = true;
    this.updateCommands();
    this.validateAddItem();
    document.getElementById("sidebarrenameitem").disabled = true;
    document.getElementById("sidebarremoveitem").disabled = true;
  },


  unlock: function () {
    this._locked = false;
    this.updateCommands();
    this.validateAddItem();
    document.getElementById("sidebarrenameitem").disabled = false;
    document.getElementById("sidebarremoveitem").disabled = false;
  },


  selectionListener: {
    QueryInterface: function (aIID) {
      if (aIID.equals(Components.interfaces.nsISelectionListener) ||
          aIID.equals(Components.interfaces.nsISupports))
        return this;
      throw Components.results.NS_ERROR_NO_INTERFACE;
    },


    notifySelectionChanged: function (aDoc, aSelection, aReason) {
      var IListener = Components.interfaces.nsISelectionListener;
      var mask = IListener.MOUSEUP_REASON | IListener.KEYPRESS_REASON
      if ((aReason & mask) == 0)
        return;

      var itembox = document.getElementById("sidebaritembox");
      var gistextbox = document.getElementById("gistextbox");

      try {
        if (aSelection.isCollapsed) {
          itembox.inputField.value = "";
          gistextbox.value = "";
        }
        else {
          var textvalue = aSelection.toString();
          itembox.inputField.value = textvalue;
          gistextbox.value = textvalue;
        }
        gPanel.validateAddItem();
      }
      catch (ex) {
        celtxBugAlert(ex, Components.stack, ex);
      }
    }
  },


  showAddBox: function showAddBox () {
    var button = document.getElementById("sidebaraddbutton");
    button.image = "chrome://celtx/skin/arrow_down.gif";
    var box = document.getElementById("sidebaradditembox");
    box.collapsed = false;

    var itembox = document.getElementById("sidebaritembox");
    itembox.focus();
  },


  hideAddBox: function hideAddBox () {
    var button = document.getElementById("sidebaraddbutton");
    button.image = "chrome://celtx/skin/arrow_right.gif";
    var box = document.getElementById("sidebaradditembox");
    box.collapsed = true;
  },


  validateAddItem: function () {
    var itembox = document.getElementById("sidebaritembox");
    var addbutton = document.getElementById("sidebaradditembutton");

    if (this._locked) {
      addbutton.disabled = true;
      return;
    }

    if (itembox.label)
      addbutton.disabled = false;
    else
      addbutton.disabled = true;
  },


  addItemKeyup: function (event) {
    if (event.keyCode == event.DOM_VK_ENTER ||
        event.keyCode == event.DOM_VK_RETURN) {
      var itembox = document.getElementById("sidebaritembox");
      this.addItem();
      itembox.inputField.select();
    }
  },


  updateSceneLabel: function updateSceneLabel (sceneres) {
    var rdfsvc = getRDFService();
    var IRes = Components.interfaces.nsIRDFResource;
    var titlearc = rdfsvc.GetResource(Cx.NS_DC + "title");
    var ordarc = rdfsvc.GetResource(Cx.NS_CX + "ordinal");

    var ds = this.controller.project.ds;
    var ordstr = getRDFString(ds, sceneres, ordarc);
    if (ordstr)
      ordstr += ". ";
    var scenetitle = ordstr + getRDFString(ds, sceneres, titlearc);

    var scenelabel = document.getElementById("sidebarscenelabel");
    scenelabel.value = scenetitle;
  },


  showScene: function showScene (sceneres) {
    if (this.curscene == sceneres.Value)
      return;

    if (! this.controller) {
      dump("*** showScene: aborting (this.controller is not set)\n");
      return;
    }

    this.curscene = sceneres.Value;

    // this.treeview.shutdown();

    this.updateSceneLabel(sceneres);
    this.showNotesForScene(sceneres);
    this.showMediaForScene(sceneres);

    var rdfsvc = getRDFService();
    var IRes = Components.interfaces.nsIRDFResource;
    var membersarc = rdfsvc.GetResource(Cx.NS_CX + "members");

    var ds = this.controller.project.ds;

    var members = ds.GetTarget(sceneres, membersarc, true);
    if (! (members && members instanceof IRes)) {
      members = rdfsvc.GetAnonymousResource();
      ds.Assert(sceneres, membersarc, members, true);
    }
    else {
      members = members.QueryInterface(IRes);
    }
    // Ensure it is decorated as a sequence
    var memberseq = new RDFSeq(ds, members);

    ds.beginUpdateBatch();
    this.extractBreakdownFromScene(sceneres);
    ds.endUpdateBatch();

    /*
    this.treeview.init(this.compositeds, members);
    var itemtree = document.getElementById("sidebaritemtree");
    itemtree.treeBoxObject.invalidate();
    */
    var itemtree = document.getElementById("sidebaritemtree");
    itemtree.setAttribute("ref", members.Value);

    if (this._selectedMarkup) {
      var self = this;
      setTimeout(function () { self.markupSelected(self._selectedMarkup); }, 0);
    }

    this.updateCommands();
  },


  showNotesForScene: function showNotesForScene (sceneres) {
    var noteslist = document.getElementById("noteslist");
    while (noteslist.hasChildNodes())
      noteslist.removeChild(noteslist.lastChild);
    var ds = this.controller.project.ds;
    var rdfsvc = getRDFService();
    var sceneidarc = rdfsvc.GetResource(Cx.NS_CX + "sceneid");

    var sceneid = getRDFString(ds, sceneres, sceneidarc);
    if (! sceneid) return;

    var para = this.controller.editor.contentDocument
      .getElementById(sceneid);
    if (! para) return;

    var seenIDs = {};
    do {
      var spans = para.getElementsByTagName("span");
      for (var i = 0; i < spans.length; ++i) {
        if (spans[i].className != "note")
          continue;
        var noteid = spans[i].getAttribute("id");
        if (! noteid || seenIDs[noteid]) {
          noteid = generateID();
          spans[i].setAttribute("id", noteid);
        }
        seenIDs[noteid] = 1;
        var notetext = spans[i].getAttribute("text");
        var notedate = spans[i].getAttribute("date");
        var scriptnote = document.createElementNS(Cx.NS_XUL, "scriptnote");
        scriptnote.setAttribute("noteid", noteid);
        scriptnote.setAttribute("value", notetext);
        if (notedate)
          scriptnote.setAttribute("date", notedate.toString());
        noteslist.appendChild(scriptnote);
      }
      para = nextElement(para);
    }
    while (para && para.className != "sceneheading")
  },


  showMediaForScene: function showMediaForScene (sceneres) {
    var medialist = document.getElementById("medialist");
    while (medialist.hasChildNodes())
      medialist.removeChild(medialist.lastChild);
    var ds = this.controller.project.ds;
    var rdfsvc = getRDFService();
    var sceneidarc = rdfsvc.GetResource(Cx.NS_CX + "sceneid");

    var sceneid = getRDFString(ds, sceneres, sceneidarc);
    if (! sceneid) return;

    var para = this.controller.editor.contentDocument
      .getElementById(sceneid);
    if (! para) return;

    var IRes = Components.interfaces.nsIRDFResource;
    var typearc = rdfsvc.GetResource(Cx.NS_RDF + "type");
    var titlearc = rdfsvc.GetResource(Cx.NS_DC + "title");

    var seenIDs = {};
    var zombies = [];
    do {
      var spans = para.getElementsByTagName("span");
      for (var i = 0; i < spans.length; ++i) {
        if (spans[i].className != "media")
          continue;

        var mediares = rdfsvc.GetResource(spans[i].getAttribute("mediares"));
        // Ditch media notes without corresponding media (this can happen on
        // a cross-project copy and paste).
        var arcs = ds.ArcLabelsOut(mediares);
        if (! arcs.hasMoreElements()) {
          zombies.push(spans[i]);
          continue;
        }

        var noteid = spans[i].getAttribute("id");
        if (! noteid || seenIDs[noteid]) {
          noteid = generateID();
          spans[i].setAttribute("id", noteid);
        }
        seenIDs[noteid] = 1;
        var mediares = rdfsvc.GetResource(spans[i].getAttribute("mediares"));
        var media = document.createElementNS(Cx.NS_XUL, "mediaitem");
        media.setAttribute("noteid", noteid);
        media.setAttribute("id", mediares.Value);
        var type = ds.GetTarget(mediares, typearc, true);
        type = type.QueryInterface(IRes);
        media.setAttribute("type", type.Value);
        var title = getRDFString(ds, mediares, titlearc);
        media.setAttribute("title", title);
        medialist.appendChild(media);
      }
      para = nextElement(para);
    }
    while (para && para.className != "sceneheading")

    this._suppressRemoveEvents = true;
    for (var i = 0; i < zombies.length; ++i)
      zombies[i].parentNode.removeChild(zombies[i]);
    this._suppressRemoveEvents = false;

    return;
  },


  onMediaAdded: function onMediaAdded (node) {
    if (! node.hasAttribute("mediares")) {
      dump("*** gPanel.onMediaAdded: Node has no mediares attribute\n");
      return;
    }

    var IPara = Components.interfaces.nsIDOMHTMLParagraphElement;
    var para = node.parentNode;
    while (para && ! (para instanceof IPara))
      para = para.parentNode;
    if (! para) {
      dump("*** gPanel.onMediaAdded: No containing paragraph for node\n");
      return;
    }

    var scene = this.controller.editor.sceneContaining(para);
    if (! scene) {
      dump("*** gPanel.onMediaAdded: Paragraph is not in a scene\n");
      return;
    }

    var sceneres = this.controller.sceneTracker.sceneForSceneID(scene.id);
    if (! sceneres) {
      dump("*** gPanel.onMediaAdded: No scene resource for scene "
        + scene.id + "\n");
      return;
    }

    var ds = this.controller.project.ds;
    var rdfsvc = getRDFService();
    var mediaarc = rdfsvc.GetResource(Cx.NS_CX + "media");
    var mediaseq = ds.GetTarget(sceneres, mediaarc, true);
    if (! mediaseq) {
      mediaseq = rdfsvc.GetAnonymousResource();
      ds.Assert(sceneres, mediaarc, mediaseq, true);
    }
    mediaseq = new RDFSeq(ds, mediaseq);

    var mediares = rdfsvc.GetResource(node.getAttribute("mediares"));

    if (mediaseq.indexOf(mediares) < 0)
      mediaseq.push(mediares);
  },


  onMediaRemoved: function onMediaRemoved (node) {
    if (! node.hasAttribute("mediares")) {
      dump("*** gPanel.onMediaRemoved: Node has no mediares attribute\n");
      return;
    }

    var IPara = Components.interfaces.nsIDOMHTMLParagraphElement;
    var para = node.parentNode;
    while (para && ! (para instanceof IPara))
      para = para.parentNode;
    if (! para) {
      dump("*** gPanel.onMediaRemoved: No containing paragraph for node\n");
      return;
    }

    var scene = this.controller.editor.sceneContaining(para);
    if (! scene) {
      dump("*** gPanel.onMediaRemoved: Paragraph is not in a scene\n");
      return;
    }

    var sceneres = this.controller.sceneTracker.sceneForSceneID(scene.id);
    if (! sceneres) {
      dump("*** gPanel.onMediaRemoved: No scene resource for scene "
        + scene.id + "\n");
      return;
    }

    var ds = this.controller.project.ds;
    var rdfsvc = getRDFService();
    var mediaarc = rdfsvc.GetResource(Cx.NS_CX + "media");
    var mediaseq = ds.GetTarget(sceneres, mediaarc, true);
    if (! mediaseq) {
      mediaseq = rdfsvc.GetAnonymousResource();
      ds.Assert(sceneres, mediaarc, mediaseq, true);
    }
    mediaseq = new RDFSeq(ds, mediaseq);

    var mediares = rdfsvc.GetResource(node.getAttribute("mediares"));

    mediaseq.remove(mediares);
  },


  selectNoteWithID: function selectNoteWithID (noteid) {
    var noteslist = document.getElementById("noteslist");
    for (var i = 0; i < noteslist.childNodes.length; ++i) {
      var note = noteslist.childNodes[i];
      if (note.getAttribute("noteid") == noteid) {
      try {
        noteslist.selectedItem = note;
      }
      catch (ex) { dump("*** selectNoteWithID: " + ex + "\n"); }
        return note;
      }
    }
    dump("*** selectNoteWithID: No note has id " + noteid + "\n");
  },


  selectMediaWithID: function selectMediaWithID (noteid) {
    var medialist = document.getElementById("medialist");
    for (var i = 0; i < medialist.childNodes.length; ++i) {
      var media = medialist.childNodes[i];
      if (media.getAttribute("noteid") == noteid) {
        medialist.selectedItem = media;
        return media;
      }
    }
    dump("*** selectMediaWithID: No media has id " + noteid + "\n");
  },


  insertNote: function insertNote () {
    this.changeSidebar("sidebarnotes");
    var note = { text: "", id: generateID(), date: new Date() };
    this.controller.editor.insertNote(note);
    if (this.curscene)
      gReportController.sceneContentChanged(
        getRDFService().GetResource(this.curscene));
    var noteitem = this.selectNoteWithID(note.id);
    noteitem.editbox.focus();
  },


  insertMedia: function insertMedia () {
    var mediamgr = new MediaManager(this.controller.project);
    var file = mediamgr.showMediaPicker("all", false);
    if (! file)
      return;
    var mediares = mediamgr.addMediaFromFile(file);
    var media = { id: generateID(), mediares: mediares.Value };
    this.controller.editor.insertMedia(media);
    this.selectMediaWithID(media.id);
  },


  removeMedia: function removeMedia (event) {
    var medialist = document.getElementById("medialist");
    var item = null;
    if (event) {
      event.stopPropagation();
      item = event.target;
    }
    else
      item = medialist.selectedItem;
    if (! item)
      return;
    var noteid = item.getAttribute("noteid");
    if (! noteid) {
      dump("*** " + item.nodeName + " does not have a noteid\n");
      return;
    }
    var media = this.controller.editor.contentDocument
      .getElementById(noteid);
    if (media)
      this.controller.editor.editor.deleteNode(media);
  },


  removeNote: function removeNote (event) {
    var noteslist = document.getElementById("noteslist");
    event.stopPropagation();
    var item = event.target;
    var noteid = item.getAttribute("noteid");
    if (! noteid) {
      dump("*** " + item.nodeName + " does not have a noteid\n");
      return;
    }
    var media = this.controller.editor.contentDocument
      .getElementById(noteid);
    if (media)
      this.controller.editor.editor.deleteNode(media);
  },


  noteSelected: function noteSelected (event) {
    var item = event.target.selectedItem;
    if (! item) return;
    var noteid = item.getAttribute("noteid");
    if (! noteid) {
      dump("*** " + item.nodeName + " does not have a noteid\n");
      return;
    }
    var note = this.controller.editor.contentDocument
      .getElementById(noteid);
    if (note)
      this.controller.editor.editor.selectElement(note);

    event.target.selectedItem.editbox.focus();
  },


  mediaSelected: function mediaSelected (event) {
    var item = event.target.selectedItem;
    if (! item) return;
    var noteid = item.getAttribute("noteid");
    if (! noteid) {
      dump("*** " + item.nodeName + " does not have a noteid\n");
      return;
    }
    var note = this.controller.editor.contentDocument
      .getElementById(noteid);
    if (note)
      this.controller.editor.editor.selectElement(note);
  },


  mediaTitleChanged: function (event) {
    dump("--- mediaTitleChanged\n");
    var item = event.target;
    if (item.nodeName != "mediaitem")
      return;

    var rdfsvc = getRDFService();
    var titlearc = rdfsvc.GetResource(Cx.NS_DC + "title");
    var res = rdfsvc.GetResource(item.id);
    setRDFString(this.controller.project.ds, res, titlearc, item.title);

    this.controller.project.isModified = true;
  },


  mediaDoubleClicked: function mediaDoubleClicked (event) {
    var item = event.target;
    if (item.nodeName != "mediaitem")
      return;

    var rdfsvc = getRDFService();
    var res = rdfsvc.GetResource(item.id);
    var file = this.controller.project.localFileFor(res);
    if (! file || ! file.exists())
      return;
    openExternalFile(file);
  },


  noteChanged: function noteChanged (event) {
    var noteid = event.target.getAttribute("noteid");
    if (! noteid) {
      dump("*** " + event.target.nodeName + " does not have a noteid\n");
      return;
    }

    var note = this.controller.editor.contentDocument
      .getElementById(noteid);
    if (! note || note.getAttribute("text") == event.target.value)
      return;

    note.setAttribute("text", event.target.value);
    note.setAttribute("date", event.target.date);
    this.controller.editor.editor.incrementModificationCount(1);
    if (this.curscene)
      gReportController.sceneContentChanged(
        getRDFService().GetResource(this.curscene));
  },


  cmdGisSearch: function cmdGisSearch () {
    var textbox = document.getElementById("gistextbox");
    if (! textbox.value) {
      gApp.openBrowser("http://images.google.com/");
      return;
    }

    var prefix = 'http://images.google.com/images?q=';
    var suffix = '&btnG=Google+Search';
    var term = encodeURIComponent(textbox.value);

    gApp.openBrowser(prefix + term + suffix);
  },


  mediaDragOver: function mediaDragOver (event) {
    nsDragAndDrop.dragOver(event, this.mediaDragObserver);
  },
  
  
  mediaDragDrop: function mediaDragDrop (event) {
    nsDragAndDrop.drop(event, this.mediaDragObserver);
  },
  
  
  mediaDragObserver: {
    flavours: [
      "text/x-moz-url",
      "text/x-moz-url-data",
      "text/unicode",
      "application/x-moz-file",
    ],


    canHandleMultipleItems: true,


    getSupportedFlavours: function () {
      var flavours = new FlavourSet();
      for (var i = 0; i < this.flavours.length; i++)
        flavours.appendFlavour(this.flavours[i]);
      return flavours;
    },


    onDragOver: function (event, flavour, session) { },


    onDrop: function (event, data, session) {
      var urls = [];

      for (var i = 0; i < data.dataList.length; i++) {
        var dataitem = data.dataList[i];
        var flavours = {};
        for (var j = 0; j < dataitem.dataList.length; j++) {
          var flavourData = dataitem.dataList[j];
          if (flavourData.flavour.contentType == "application/x-moz-file") {
            // For some reason, this gets assigned nsISupportsString instead
            // of nsIFile, causing flavourData.data to fail.
            var nsIFile = Components.interfaces.nsIFile;
            var file = flavourData.supports.QueryInterface(nsIFile);
            flavours["application/x-moz-file"] = file;
          }
          else
            flavours[flavourData.flavour.contentType] = flavourData.data;
        }
        if (flavours["text/x-moz-url"]) {
          urls.push(flavours["text/x-moz-url"].split("\n")[0]);
        }
        else if (flavours["text/x-moz-url-data"]) {
          urls.push(flavours["text/x-moz-url-data"]);
        }
        else if (flavours["text/unicode"]) {
          urls.push(flavours["text/unicode"]);
        }
        else if (flavours["application/x-moz-file"]) {
          urls.push(fileToFileURL(flavours["application/x-moz-file"]));
        }
      }

      var mediamgr = new MediaManager(gPanel.controller.project);
      var self = gPanel;
      var addFileCallback = function (file) {
        dump("--- addFileCallback: " + file.path + "\n");
        var mediares = mediamgr.addMediaFromFile(file);
        var media = { id: generateID(), mediares: mediares.Value };
        self.controller.editor.insertMedia(media);
      };

      for (var i = 0 ; i < urls.length; i++) {
        var imgURL = urls[i];
        if (imgURL.match(/^http/)) {
          // Check for GIS searches
          var gis;
          if (gis = imgURL.match(/imgurl=([^&]+)/)) {
            imgURL = unescape(gis[1]);
          }
        }

        if (! imgURL) {
          dump("*** Couldn't match " + imgURL + " to anything meaningful.\n");
          return;
        }

        try {
          var ios = getIOService();
          var url = ios.newURI(imgURL, null, null);
          if (url.scheme == "file") {
            var file = fileURLToFile(imgURL);
            addFileCallback(file);
          }
          else {
            var filename = unescape(url.path.replace(/.*\//, ""));
            var tmpfile = getTempDir();
            tmpfile.append(filename);
            tmpfile.createUnique(0, 0600);
            var listener = {
              onProgressChange: function (webProgress, request,
                              curSelfProgress, maxSelfProgress,
                              curTotalProgress, maxTotalProgress) {},
              onStateChange: function (prog, request, stateFlags, status) {
                var IProg = Components.interfaces.nsIWebProgressListener;
                if (stateFlags & IProg.STATE_STOP)
                  addFileCallback(tmpfile);
              },
              onLocationChange: function (prog, request, location) {},
              onStatusChange: function (prog, request, status, message) {},
              onSecurityChange: function (prog, request, state) {}
            };
            var persist = getWebBrowserPersist();
            persist.persistFlags |= persist.PERSIST_FLAGS_BYPASS_CACHE;
            persist.progressListener = listener;
            persist.saveURI(url, null, null, null, null, tmpfile);
          }
        }
        catch (ex) {
          dump("*** gPanel.mediaDragObserver.onDrop error: " + ex + "\n");
        }
      }
    }
  },


  handleEvent: function handleEvent (event) {
    var IElem = Components.interfaces.nsIDOMHTMLElement;
    // We only care about notes and media
    if (! (event.target instanceof IElem))
      return;

    if (event.target.className != "note" && event.target.className != "media")
      return;

    if (event.type == "DOMNodeInserted") {
      var noteid = event.target.id;
      var list = null;
      if (event.target.className == "note") {
        list = document.getElementById("noteslist");
        this.showNotesForScene(getRDFService().GetResource(this.curscene));
      }
      else {
        gPanel.onMediaAdded(event.target);
        list = document.getElementById("medialist");
        this.showMediaForScene(getRDFService().GetResource(this.curscene));
      }
      /*
      for (var i = 0; i < list.childNodes.length; ++i) {
        var note = list.childNodes[i];
        if (note.getAttribute("noteid") == noteid) {
          list.selectedItem = note;
          break;
        }
      }
      */
    }
    else if (event.type == "DOMNodeRemoved") {
      if (this._suppressRemoveEvents)
        return;

      var noteid = event.target.id;
      var list = null;
      if (event.target.className == "note") {
        list = document.getElementById("noteslist");
        this.showNotesForScene(getRDFService().GetResource(this.curscene));
        gReportController.sceneContentChanged(
          getRDFService().GetResource(this.curscene));
      }
      else {
        gPanel.onMediaRemoved(event.target);
        list = document.getElementById("medialist");
        this.showMediaForScene(getRDFService().GetResource(this.curscene));
      }
      for (var i = 0; i < list.childNodes.length; ++i) {
        var note = list.childNodes[i];
        if (note.getAttribute("noteid") == noteid) {
          list.removeChild(note);
          break;
        }
      }
    }
  },


  treeItemSelected: function treeItemSelected () {
    this.updateCommands();
  },


  treeItemDoubleClicked: function treeItemDoubleClicked () {
    // Open the selected item
    /*
    var itemuri = this.treeview.selectedItem;
    if (! itemuri)
      return;

    top.gFrameLoader.loadDocument(getRDFService().GetResource(itemuri));
    */
    var tree = document.getElementById("sidebaritemtree");
    var idx = tree.view.selection.currentIndex;
    if (idx < 0)
      return;
    // Don't attempt to open the departments
    if (tree.view.getLevel(idx) == 0)
      return;
    var itemres = tree.view.getResourceAtIndex(idx);
    top.openInMasterCatalog(itemres);
  },


  renameItem: function renameItem () {
    var tree = document.getElementById("sidebaritemtree");
    var row = tree.view.selection.currentIndex;
    if (row < 0)
      return;

    var itemres = tree.view.getResourceAtIndex(row);

    var ds = this.controller.project.ds;
    var rdfsvc = getRDFService();
    var titlearc = rdfsvc.GetResource(Cx.NS_DC + "title");
    var oldtitle = getRDFString(ds, itemres, titlearc);

    var dlgtitle = gApp.getText("RenameItem");
    var msg = gApp.getText("RenameItemPrompt");
    var title = { value: oldtitle };
    var checkstate = { value: false };
    var psvc = getPromptService();
    if (! psvc.prompt(window, dlgtitle, msg, title, null, checkstate))
      return;

    if (! title.value)
      return;

    ds.beginUpdateBatch();
    setRDFString(ds, itemres, titlearc, title.value);
    ds.endUpdateBatch();
  },


  markupSelected: function markupSelected (itemuri) {
    if (! this.curscene)
      return;

    var rdfsvc = getRDFService();
    var IRes = Components.interfaces.nsIRDFResource;
    var itemres = rdfsvc.GetResource(itemuri);
    var ds = this.controller.project.ds;
    var rdftypearc = rdfsvc.GetResource(Cx.NS_RDF + "type");
    var type = ds.GetTarget(itemres, rdftypearc, true);
    if (! (type && type instanceof IRes)) {
      dump("*** markupSelected: no type associated with " + itemuri + "\n");
      return;
    }
    type = type.QueryInterface(IRes);

    var scene = new Scene(ds, rdfsvc.GetResource(this.curscene));
    var deptseq = scene._getDeptSequence(type);
    if (! deptseq) {
      dump("*** item is mysteriously not in this scene\n");
      // Cache the selected markup, since it might be a selection in
      // a different scene, and we haven't loaded the data for that
      // scene yet.
      this._selectedMarkup = itemuri;
      return;
    }

    var tree = document.getElementById("sidebaritemtree");
    var deptidx = tree.view.getIndexOfResource(deptseq.res);
    if (deptidx < 0) {
      dump("*** markupSelected: Could not find department for item\n");
      return;
    }

    if (! tree.view.isContainerOpen(deptidx))
      tree.view.toggleOpenState(deptidx);
    var idx = tree.view.getIndexOfResource(itemres);
    if (idx >= 0)
      tree.view.selection.select(idx);
  },


  deptSelected: function deptSelected () {
    var deptlist = document.getElementById("sidebardeptlist");
    var itempopup = document.getElementById("sidebaritempopup");
    itempopup.setAttribute("ref", deptlist.value);
    itempopup.builder.rebuild();
  },


  // Watch for changes to the scene title
  onAssert: function (ds, src, prop, tgt) {
    if (src.Value != this.curscene)
      return;

    this.updateSceneLabel(src);
  },
  onChange: function (ds, src, prop, oldtgt, newtgt) {
    if (src.Value != this.curscene)
      return;

    this.updateSceneLabel(src);
  },
  onMove: function (ds, oldsrc, newsrc, prop, tgt) {},
  onUnassert: function (ds, src, prop, tgt) {},
  onBeginUpdateBatch: function (ds) {},
  onEndUpdateBatch: function (ds) {},


  restoreSelection: function restoreSelection () {
    if (this._cachedDept) {
      this.selectDept(this._cachedDept);
      if (this._cachedItem)
        this.selectItem(this._cachedItem);
    }
    this._cachedDept = null;
    this._cachedItem = null;
    if (gController._activeController == gScriptController)
      gScriptController.editor.contentWindow.focus();
  },


  init: function (controller) {
    var rdfsvc = getRDFService();
    this.controller = controller;
    this.compositeds = getCompositeDataSource();
    this.compositeds.AddDataSource(this.controller.project.ds);
    this.compositeds.AddDataSource(rdfsvc.GetDataSourceBlocking(Cx.SCHEMA_URL));

    this.sidebar = document.getElementById("sidebar");

    this.controller.project.ds.AddObserver(this);

    var itempopup = document.getElementById("sidebaritempopup");
    itempopup.database.AddDataSource(this.controller.project.ds);

    var deptlist = document.getElementById("sidebardeptlist");
    var preffile = currentProfileDir();
    preffile.append(Cx.PREFS_FILE);
    var prefds = rdfsvc.GetDataSourceBlocking(fileToFileURL(preffile));
    deptlist.database.AddDataSource(prefds);
    deptlist.ref = Cx.NS_CX + "Prefs/Categories";
    setTimeout(function () {
      var sortService = Components.classes[
        "@mozilla.org/xul/xul-sort-service;1"]
        .getService(Components.interfaces.nsIXULSortService);
      sortService.sort(deptlist, Cx.NS_RDFS + "label", "ascending");
      deptlist.selectedIndex = 0;
    }, 0);

    var medialist = document.getElementById("medialist");
    var listener = {
      handleEvent: function (event) {
        gPanel.removeMedia(event);
      }
    };
    medialist.addEventListener("remove", listener, false);

    var noteslist = document.getElementById("noteslist");
    var listener2 = {
      handleEvent: function (event) {
        gPanel.removeNote(event);
      }
    };
    noteslist.addEventListener("remove", listener2, false);

    /*
    this.treeview = new CatalogTreeView();
    var itemtree = document.getElementById("sidebaritemtree");
    itemtree.treeBoxObject.view = this.treeview;
    */
    var tree = document.getElementById("sidebaritemtree");
    tree.database.AddDataSource(this.controller.project.ds);

    // Deferred refresh
    if (this.curscene) {
      var sceneres = this.curscene;
      this.curscene = null;
      this.showScene(sceneres);
    }

    this.updateCommands();
    this.validateAddItem();

    this._suppressSidebarSelect = false
    this.restoreSidebarState();

    try {
    var body = this.controller.editor.contentDocument.body;
    body.addEventListener("DOMNodeInserted", this, false);
    body.addEventListener("DOMNodeRemoved", this, false);
    // To catch deletes of SPANs
    this.controller.editor.editor.addEditActionListener(this);

    var privsel = this.controller.editor.selection.QueryInterface(
      Components.interfaces.nsISelectionPrivate);
    privsel.addSelectionListener(this.selectionListener);
    }
    catch (ex) {
      dump("*** addEventListeners failed: " + ex + "\n");
    }

    this.refreshAllSceneBreakdown();
  },


  refreshAllSceneBreakdown: function () {
    var IRes = Components.interfaces.nsIRDFResource;
    var rdfsvc = getRDFService();
    var scenesarc = rdfsvc.GetResource(Cx.NS_CX + "scenes");
    var sceneidarc = rdfsvc.GetResource(Cx.NS_CX + "sceneid");
    var ds = this.controller.project.ds;
    var scenes = ds.GetTarget(this.controller.docres, scenesarc, true);
    if (! (scenes && scenes instanceof IRes))
      return;
    scenes = new RDFSeq(ds, scenes.QueryInterface(IRes));
    var scenelist = scenes.toArray();
    var start = (new Date()).valueOf();
    /*
    var i = 0;
    var self = this;
    function updateNextScene () {
      if (i >= scenelist.length) return;
      var sceneres = scenelist[i++].QueryInterface(IRes);
      self.extractBreakdownFromScene(sceneres);
      setTimeout(updateNextScene, 3000);
    }
    setTimeout(updateNextScene, 3000);
    */
    ds.beginUpdateBatch();
    for (var i = 0; i < scenelist.length; ++i) {
      var sceneres = scenelist[i].QueryInterface(IRes);
      this.extractBreakdownFromScene(sceneres);
    }
    ds.endUpdateBatch();
    var end = (new Date()).valueOf();
    dump("--- refreshAllSceneBreakdown: took " + (end - start) + "ms\n");
  },


  shutdown: function () {
    var body = this.controller.editor.contentDocument.body;
    body = body.QueryInterface(Components.interfaces.nsIDOMEventTarget);
    body.removeEventListener("DOMNodeInserted", this, false);
    body.removeEventListener("DOMNodeRemoved", this, false);
    this.controller.editor.editor.removeEditActionListener(this);

    var privsel = this.controller.editor.selection.QueryInterface(
      Components.interfaces.nsISelectionPrivate);
    privsel.removeSelectionListener(this.selectionListener);

    this.controller.project.ds.RemoveObserver(this);

    var itemtree = document.getElementById("sidebaritemtree");
    itemtree.database.RemoveDataSource(this.controller.project.ds);

    var itempopup = document.getElementById("sidebaritempopup");
    itempopup.database.RemoveDataSource(this.controller.project.ds);

    // this.treeview.shutdown();

    this.saveSidebarState();
  },


  // nsIEditActionListener implementation
  DidDeleteSelection: function (selection) {
    if (this._selectionHasMarkup) {
      var scene = getRDFService().GetResource(this.curscene);
      var self = this;
      setTimeout(function () { self.extractBreakdownFromScene(scene); }, 0);
    }
  },
  WillDeleteSelection: function (selection) {
    // Can you even make disjoint selections? Maybe with bidi?
    this._selectionHasMarkup = false;
    for (var i = 0; i < selection.rangeCount; ++i) {
      var range = selection.getRangeAt(i);
      var ancestor = range.commonAncestorContainer;
      if (! (ancestor instanceof Components.interfaces.nsIDOMElement))
        continue;
      var spans = ancestor.getElementsByTagName("span");
      for (var j = 0; j < spans.length; ++j) {
        if (spans[j].hasAttribute("ref")) {
          this._selectionHasMarkup = true;
          return;
        }
      }
    }
  },
  DidCreateNode: function (tag, node, parent, position, result) {},
  DidDeleteNode: function (child, result) {
    if (this._selectionHasMarkup) {
      var scene = getRDFService().GetResource(this.curscene);
      var self = this;
      setTimeout(function () { self.extractBreakdownFromScene(scene); }, 0);
    }
  },
  DidDeleteText: function (textNode, offset, length, result) {},
  DidInsertNode: function (node, parent, position, result) {},
  DidInsertText: function (textNode, offset, string, result) {},
  DidJoinNodes: function (leftNode, rightNode, parent, result) {},
  DidSplitNode: function (existingRightNode, offset, newLeftNode, result) {},
  WillCreateNode: function (tag, node, parent, position) {},
  WillDeleteNode: function (child) {
    if (child instanceof Components.interfaces.nsIDOMElement &&
        child.hasAttribute("ref"))
      this._selectionHasMarkup = true;
    else
      this._selectionHasMarkup = false;
  },
  WillDeleteText: function (textNode, offset, length) {},
  WillInsertNode: function (node, parent, position) {},
  WillInsertText: function (textNode, offset, string) {},
  WillJoinNodes: function (leftNode, rightNode, parent) {},
  WillSplitNode: function (existingRightNode, offset) {},


  _suppressSidebarSelect: true,


  changeSidebar: function changeSidebar (view) {
    if (this._suppressSidebarSelect)
      return;

    // This can get called before init, so we need to check if this.sidebar
    // is set.
    if (! this.sidebar)
      this.sidebar = document.getElementById("sidebar");

    var deck = document.getElementById("sidebardeck");
    var tabs = document.getElementById("sidebartabs");

    if (view == "close" && this.sidebar.collapsed ||
        view == deck.selectedPanel.id && ! this.sidebar.collapsed)
       return;

    gScriptController._modified = true;

    this._suppressSidebarSelect = true;
    var sidebarbtn = document.getElementById("celtx-sidebar-button");
    for (var i = 0; i < tabs.childNodes.length; ++i) {
      var tab = tabs.childNodes[i];
      if (tab.getAttribute("value") == view) {
        if (tabs.selectedItem != tab)
          tabs.selectedItem = tab;
        break;
      }
    }
    if (view == "close") {
      this.sidebar.collapsed = true;
      sidebarbtn.checked = false;
    }
    else {
      // Handle pre-1.0 true/false state, and open by default
      if (! view || view == "false" || view == "true")
        view = "sidebarnotes";
      deck.selectedPanel = document.getElementById(view);
      if (this.sidebar.collapsed) {
        this.sidebar.collapsed = false;
        sidebarbtn.checked = true;
      }
    }

    this._suppressSidebarSelect = false;
  },


  toggleSidebar: function toggleSidebar () {
    var collapsed = ! this.sidebar.collapsed;
    this.sidebar.collapsed = collapsed;
    document.getElementById("celtx-sidebar-button").checked = ! collapsed;
  },


  saveSidebarState: function () {
    var deck = document.getElementById("sidebardeck");
    var rdfsvc = getRDFService();
    var sidebararc = rdfsvc.GetResource(Cx.NS_CX + "sidebarvisible");
    var ds = this.controller.project.ds;
    var state = this.sidebar.collapsed ? "close" : deck.selectedPanel.id;
    setRDFString(ds, this.controller.docres, sidebararc, state);
  },


  restoreSidebarState: function () {
    var rdfsvc = getRDFService();
    var sidebararc = rdfsvc.GetResource(Cx.NS_CX + "sidebarvisible");
    var ds = this.controller.project.ds;
    var state = getRDFString(ds, this.controller.docres, sidebararc);
    this.changeSidebar(state);
    gScriptController._modified = false;
  },


  addItem: function addItem () {
    if (! this.curscene)
      return;

    var deptlist = document.getElementById("sidebardeptlist");
    var itembox = document.getElementById("sidebaritembox");
    if (! itembox.label)
      return;

    var ds = this.controller.project.ds;
    var rdfsvc = getRDFService();

    var typearc = rdfsvc.GetResource(Cx.NS_RDF + "type");
    var type = rdfsvc.GetResource(deptlist.value);

    ds.beginUpdateBatch();

    var item = null;
    if (itembox.selectedItem) {
      item = rdfsvc.GetResource(itembox.selectedItem.value);
    }
    else {
      item = rdfsvc.GetResource(this.controller.project.mintURI());
      ds.Assert(item, typearc, type, true);
      var titlearc = rdfsvc.GetResource(Cx.NS_DC + "title");
      setRDFString(ds, item, titlearc, itembox.label);
    }

    var sceneres = rdfsvc.GetResource(this.curscene);
    var scene = new Scene(ds, sceneres);
    scene.addItem(item);

    var editor = this.controller.editor;
    if (! editor.selection.isCollapsed) {
      var elemarc = rdfsvc.GetResource(Cx.NS_CX + "element");
      var elem = getRDFString(this.compositeds, type, elemarc);
      editor.markup(elem, item.Value);
      scene.addToMarkup(item);
    }

    ds.endUpdateBatch();
  },


  removeItem: function removeItem () {
    if (! this.curscene)
      return;

    var itemtree = document.getElementById("sidebaritemtree");
    if (itemtree.view.selection.count != 1)
      return;

    var idx = itemtree.view.selection.currentIndex;
    if (idx < 0)
      return;

    // Don't try to delete departments
    if (itemtree.view.getLevel(idx) == 0)
      return;

    var itemres = itemtree.view.getResourceAtIndex(idx);
    if (! itemres)
      return;

    var ds = this.controller.project.ds;
    var rdfsvc = getRDFService();
    var IRes = Components.interfaces.nsIRDFResource;

    var sceneres = rdfsvc.GetResource(this.curscene);
    var scene = new Scene(ds, sceneres);

    var sceneidarc = rdfsvc.GetResource(Cx.NS_CX + "sceneid");
    var sceneid = getRDFString(ds, sceneres, sceneidarc);
    if (! sceneid)
      throw "Current scene does not have a scene id";
    var para = this.controller.editor.contentDocument.getElementById(sceneid);
    if (! para)
      throw "No paragraph with scene id " + sceneid;

    if (scene.containsInMarkup(itemres)) {
      this.controller.editor.editor.beginTransaction();
      // Remove from markup
      para = nextElement(para);
      while (para && para.className != "sceneheading") {
        var spans = para.getElementsByTagName("span");
        for (var i = 0; i < spans.length; ++i) {
          if (spans[i].getAttribute("ref") == itemres.Value)
            this.controller.editor.unmarkupSpan(spans[i]);
        }
        para = nextElement(para);
      }
      this.controller.editor.editor.endTransaction();
      scene.removeFromMarkup(itemres);
    }
    ds.beginUpdateBatch();
    scene.removeItem(itemres);
    ds.endUpdateBatch();
  },


  isItemInSceneMarkup: function (itemres, sceneres) {
    var scene = new Scene(this.controller.project.ds, sceneres)
    return scene.containsInMarkup(itemres);
  },


  extractBreakdownFromScene: function (sceneres) {
    var ds = this.controller.project.ds;
    var IRes = Components.interfaces.nsIRDFResource;
    var rdfsvc = getRDFService();
    var rdftypearc = rdfsvc.GetResource(Cx.NS_RDF + "type");
    var titlearc = rdfsvc.GetResource(Cx.NS_DC + "title");
    var sceneidarc = rdfsvc.GetResource(Cx.NS_CX + "sceneid");
    var sceneid = getRDFString(ds, sceneres, sceneidarc);

    if (! sceneid) {
      dump("*** extractBreakdownFromScene: No sceneid for sceneres "
        + sceneres.Value + "\n");
      return;
    }

    var para = this.controller.editor.contentDocument.getElementById(sceneid);
    if (! para) {
      dump("*** extractBreakdownFromScene: Scene not found: " + sceneid + "\n");
      return;
    }

    var validator = {
      getCanonicalCharacterName: function (node) {
        var charname = stringify(node).toUpperCase();
        charname = charname.replace(/\(.*\)\s*$/, "");
        charname = charname.replace(/^\s+/, "");
        charname = charname.replace(/\s+$/, "");
        return charname;
      },
      getCanonicalNameFromLit: function (node) {
        node = node.QueryInterface(Components.interfaces.nsIRDFLiteral);
        var charname = node.Value.toUpperCase();
        return charname;
      },
      isWhitespaceOnly: function (node) {
        if (stringify(node).match(/\S/))
          return false;
        else
          return true;
      }
    };

    var scene = Components.classes["@celtx.com/scriptscene;1"]
      .createInstance(Components.interfaces.nsIScriptScene);
    scene.init(ds, sceneres);
    scene.extractBreakdownFromScene(para, validator);
  },


  autoAddCharacter: function (charname) {
    if (! this.curscene) {
      dump("*** autoAddCharacter: No current scene\n");
      return;
    }

    charname = charname.toUpperCase().replace(/\s*\(.*\)\s*$/, "");
    if (! charname)
      return;

    var ds = this.controller.project.ds;
    var rdfsvc = getRDFService();
    var typearc = rdfsvc.GetResource(Cx.NS_RDF + "type");
    var chartype = rdfsvc.GetResource(Cx.NS_CX + "Cast");
    var titlearc = rdfsvc.GetResource(Cx.NS_DC + "title");

    ds.beginUpdateBatch();
    try {
      var namecache = new CharacterNameCache(ds);
      var charres = namecache.charWithName(charname);
      if (! charres) {
        charres = rdfsvc.GetResource(this.controller.project.mintURI());
        ds.Assert(charres, typearc, chartype, true);
        setRDFString(ds, charres, titlearc, charname);
      }
      var scene = new Scene(ds, rdfsvc.GetResource(this.curscene));
      if (! scene.containsItem(charres))
        scene.addItem(charres);
    }
    catch (ex) {
      celtxBugAlert(ex, Components.stack, ex);
    }
    ds.endUpdateBatch();
  },


  findChars: function findChars () {
    var xpe = new XPathEvaluator();
    // By finding sceneheadings as well as characters, we don't need to
    // churn all the time doing a scene heading look-back.
    var str = "//p[@class='sceneheading' or @class='character']";
    var result = xpe.evaluate(str, this.controller.editor.contentDocument,
      null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);

    if (result.snapshotLength == 0)
      return;

    var rdfsvc = getRDFService();
    var typearc = rdfsvc.GetResource(Cx.NS_RDF + "type");
    var chartype = rdfsvc.GetResource(Cx.NS_CX + "Cast");
    var titlearc = rdfsvc.GetResource(Cx.NS_DC + "title");
    var sceneidarc = rdfsvc.GetResource(Cx.NS_CX + "sceneid");
    var scenesarc = rdfsvc.GetResource(Cx.NS_CX + "scenes");

    var ds = this.controller.project.ds;
    var namecache = new CharacterNameCache(ds);
    var scenelist = ds.GetTarget(gScriptController.docres, scenesarc, true);
    if (! scenelist) {
      dump("*** current script has no scene list\n");
      return;
    }
    scenelist = scenelist.QueryInterface(Components.interfaces.nsIRDFResource);
    scenelist = new RDFSeq(ds, scenelist);

    var scene = null;

    ds.beginUpdateBatch();
    for (var i = 0; i < result.snapshotLength; ++i) {
      var node = result.snapshotItem(i);
      if (node.className == "sceneheading") {
        if (! node.id) {
          dump("*** found a scene without an id\n");
          continue;
        }
        var sceneidlit = rdfsvc.GetLiteral(node.id);
        var scenersrcs = ds.GetSources(sceneidarc, sceneidlit, true);
        var sceneres = null;
        while (scenersrcs.hasMoreElements()) {
          var tmpscene = scenersrcs.getNext().QueryInterface(
            Components.interfaces.nsIRDFResource);
          if (scenelist.indexOf(tmpscene) >= 0) {
            sceneres = tmpscene;
            break;
          }
        }
        if (sceneres)
          scene = new Scene(ds, sceneres);
        else
          dump("*** no scene in this script with ID " + node.id + "\n");
        continue;
      }

      if (! scene) {
        dump("*** can't add character without a scene\n");
        continue;
      }

      var charname = stringify(node).toUpperCase();
      charname = charname.replace(/\s*\(.*\)\s*$/, "");
      if (! charname)
        continue;

      var charres = namecache.charWithName(charname);
      if (! charres) {
        var charres = rdfsvc.GetResource(this.controller.project.mintURI());
        ds.Assert(charres, typearc, chartype, true);
        setRDFString(ds, charres, titlearc, charname);
        namecache.map[charname] = charres.Value;
      }
      scene.addItem(charres);
    }
    ds.endUpdateBatch();
  }
};


function CharacterNameCache (ds) {
  this.ds = ds;
  this.map = {};
  var rdfsvc = getRDFService();
  var typearc = rdfsvc.GetResource(Cx.NS_RDF + "type");
  var chartype = rdfsvc.GetResource(Cx.NS_CX + "Cast");
  var titlearc = rdfsvc.GetResource(Cx.NS_DC + "title");
  var chars = ds.GetSources(typearc, chartype, true);
  while (chars.hasMoreElements()) {
    var charres = chars.getNext().QueryInterface(
      Components.interfaces.nsIRDFResource);
    var name = getRDFString(ds, charres, titlearc).toUpperCase();
    this.map[name] = charres.Value;
  }
}

CharacterNameCache.prototype = {
  charWithName: function charWithName (name) {
    name = name.toUpperCase().replace(/\s*\(.*\)\s*$/, "");
    if (name in this.map)
      return getRDFService().GetResource(this.map[name]);
    return null;
  }
};
