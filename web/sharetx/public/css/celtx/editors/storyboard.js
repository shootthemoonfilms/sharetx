function getController () {
  return gController;
}


function loaded () {
  gController.frame = document.getElementById("frame");
}


function setOutlineView (outline) {
  gController.outline = outline;
  gController.outline.gDelegate = gController;
}


function getBrowser () {
  return gController.frame;
}


function getPPBrowser () {
  return getBrowser();
}

function getNavToolbox () {
  if ("navtoolbox" in gController._activeController)
    return gController._activeController.navtoolbox;
  return getPPBrowser();
}

function getWebNavigation () {
  var browser = getBrowser();
  return browser ? browser.webNavigation : null;
}


var gController = {
  columns: 3,
  modified: false,


  get selection () {
    return this._selection;
  },


  set selection (val) {
    if (this._selection)
      this._selection.removeAttribute("selected");
    this._selection = val;
    var toolbar = this.frame.contentDocument.getElementById("selecttoolbar");
    if (val) {
      val.setAttribute("selected", "true");
      var node = this.shotForCell(val);
      var row = this.treeview.nodeToRow(node);
      if (row >= 0) {
        this.treeview.selection.select(row);
      }
      else {
        this.treeview.selection.clearSelection();
      }

      var coords = { x: { value: 0 }, y: { value: 0 } };
      // We hard code these because we can't calculate them on something
      // that's hidden. Also, absolute positioning seems to result in an
      // incorrect clientWidth on the toolbar.
      var kTBWidth = 20; // 1x16 images, 2x2 border
      this.getCoordsForCell(val, coords.x, coords.y);
      var offsetx = val.clientWidth - kTBWidth;
      var offsety = 8; // padding
      if (toolbar) {
        toolbar.setAttribute("style", "top: " + (coords.y.value + offsety)
          + "px; left: " + (coords.x.value + offsetx) + "px;");
        toolbar.removeAttribute("hidden");
      }
      else
        dump("*** no toolbar in document\n");
    }
    else {
      this.treeview.selection.clearSelection();
      if (toolbar)
        toolbar.setAttribute("hidden", "true");
    }
    return val;
  },


  checkSelection: function () {
    var sel = this.selection;
    if (! sel)
      return;
    if (! sel.parentNode)
      this.selection = null;
  },


  setColumns: function (columns) {
    if (columns == this.columns)
      return;
    this.columns = columns;
    this.refresh();
  },


  supportsCommand: function (cmd) {
    switch (cmd) {
      case "cmd-page-setup":
      case "cmd-print":
        return true;
      default:
        return false;
    }
  },


  isCommandEnabled: function (cmd) {
    return this.supportsCommand(cmd);
  },


  doCommand: function (cmd) {
    switch (cmd) {
      case "cmd-page-setup":
        PrintUtils.showPageSetup();
        break;
      case "cmd-print":
        gApp.setPrintMargins(0.25, 0, 0.25, 0);
        this.print();
        break;
    }
  },


  open: function open (project, docres) {
    this.project = project;
    this.docres = docres;
    this.reportFile = tempFile("xhtml");
    var file = this.project.fileForResource(this.docres);
    if (isReadableFile(file)) {
      var parser = new DOMParser();
      var bis = getBufferedFileInputStream(file);
      // This spits out a lot of security errors to the console about
      // moz-nullprincipal not being allowed to load or link to files.
      // This is because we're executing with the system principal
      // (all powerful) and DOMParser substitutes the null principal (powerless)
      // for security reasons. Whenever it comes across a file URI in the
      // storyboard, it complains, but at least it doesn't interrupt parsing.
      // We might be able to suppress the warnings by creating a dummy
      // principal, but it's probably not worth the effort.
      this.storydom = parser.parseFromStream(bis, "UTF-8", file.fileSize,
        "application/xml");
      bis.close();
    }
    else {
      var impl = document.implementation;
      this.storydom = impl.createDocument("", "storyboard", null);
      var seq = this.storydom.createElement("sequence");
      seq.setAttribute("title", gApp.getText("Untitled"));
      this.storydom.documentElement.appendChild(seq);
      this.modified = true;
    }

    this.checkMediaResources();
    this.resolveImageAttributes();

    // Add IDs to each sequence if there are none
    var seqs = this.storydom.getElementsByTagName("sequence");
    for (var i = 0; i < seqs.length; ++i) {
      if (! seqs[i].id)
        seqs[i].id = generateID();
    }

    this.treeview = new StoryboardTree(this);
    // These don't seem be getting triggered. 
    this.storydom.documentElement.addEventListener("DOMAttrModified", this.treeview, false);
    this.storydom.documentElement.addEventListener("DOMNodeInserted", this.treeview, false);
    this.storydom.documentElement.addEventListener("DOMNodeRemoved", this.treeview, false);
    var navtree = this.outline.document.getElementById("navtree");
    navtree.view = this.treeview;

    try {
      this.refresh();
    }
    catch (ex) {
      dump("*** storyboard.open: " + ex + "\n");
    }
    var title = project.model.target(RES(docres.Value), PROP('dc:title'));
    this.storydom.documentElement.setAttribute("title", title.value);
  },


  close: function close () {
  },


  save: function save () {
    var file = this.project.fileForResource(this.docres);
    if (! file) {
      file = this.project.projectFolder;
      file.append("storyboard.xml");
      file.createUnique(0, 0644 & file.parent.permissions);
      this.project.addFileToDocument(file, this.docres);
    }
    serializeDOMtoFile(this.storydom, file);
    this.modified = false;
  },


  focus: function focus () {
    gController.frame.setAttribute("type", "content-primary");
  },


  blur: function blur () {
    gController.frame.setAttribute("type", "content");
  },


  print: function print () {
    PrintUtils.print();
    return;
  },


  /**
   * Toggle whether or not the storyboard is in editing mode.
   */
  toggleEditing: function () {
    var body = this.frame.contentDocument.body;
    if (body.getAttribute("edit") == "true")
      body.setAttribute("edit", "false");
    else
      body.setAttribute("edit", "true");
  },


  /**
   * Check if the window should scroll during dragging. This is necessary
   * because the window will not scroll automatically as a result of the
   * storyboard's custom drag and drop code.
   */
  checkScroll: function () {
    this._scrollTimeout = null;

    if (! this._draggedShot) return;

    var framex = this.frame.boxObject.screenX;
    var framey = this.frame.boxObject.screenY;
    var framew = this.frame.boxObject.width;
    var frameh = this.frame.boxObject.height;

    // Don't scroll while the mouse is horizontally outside the area
    if (this._mouseX < framex || this._mouseX > framex + framew)
      return;

    // How close do you have to be to the top or bottom to initiate scrolling?
    var tolerance = 20; // pixels
    var maxspeed = 50;
    var top = framey;
    var bottom = framey + frameh;
    var deltatop = this._mouseY - top;
    var deltabottom = bottom - this._mouseY;

    // How fast it scrolls is determined by the proximity to the edge
    if (0 <= deltatop && deltatop < tolerance) {
      var speed = Math.floor(maxspeed / deltatop);
      this.frame.contentWindow.scrollBy(0, -speed);
      this.updateDropShadow();
    }
    else if (0 <= deltabottom && deltabottom < tolerance) {
      var speed = Math.floor(maxspeed / deltabottom);
      this.frame.contentWindow.scrollBy(0, speed);
      this.updateDropShadow();
    }
    else
      return;
    this._scrollTimeout = setTimeout("gController.checkScroll()", 100);
  },


  /**
   * Update the drop shadow during shot dragging. A dotted outline is drawn
   * relative to the mouse's position to represent the shot being dragged.
   */
  updateDropShadow: function () {
    var doc = this.frame.contentDocument;
    var shadow = doc.getElementById("dropshadow");

    // Calculate client coordinates from screen coordinates
    var offsetx = this.frame.contentWindow.scrollX;
    var offsety = this.frame.contentWindow.scrollY;
    var x = this._mouseX - this._grabX - this.frame.boxObject.screenX + offsetx;
    var y = this._mouseY - this._grabY - this.frame.boxObject.screenY + offsety;
    var w = this._draggedImage.clientWidth;
    var h = this._draggedImage.clientHeight;
    // Constrain the drop shadow to stay within the document
    var framew = doc.documentElement.clientWidth;
    var frameh = doc.documentElement.clientHeight;
    var bordersize = 2;
    if (x + w + bordersize > framew)
      x = framew - w - bordersize;
    if (y + h >= frameh)
      y = frameh - h - bordersize;
    var style = "left: " + x + "px; top: " + y + "px;"
      + " width: " + w + "px; height: " + h + "px;";
    shadow.setAttribute("style", style);
    if (shadow.hasAttribute("hidden"))
      shadow.removeAttribute("hidden");
  },


  /**
   * Update the drop target during shot dragging. If the mouse is over
   * another shot, an indicator is added to show where the shot being
   * dragged will be inserted.
   */
  updateDropTarget: function () {
    // We can't use the mousemove event target because it's the drop shadow

    // Calculate client coordinates from screen coordinates
    var offsetx = this.frame.contentWindow.scrollX;
    var offsety = this.frame.contentWindow.scrollY;
    var x = this._mouseX - this.frame.boxObject.screenX + offsetx;
    var y = this._mouseY - this.frame.boxObject.screenY + offsety;
    var realcoords = { top:0,left:0,bottom:0,right:0 };
    shot = this.shotAt(x, y, realcoords);

    if (! shot || shot == this._draggedShot) {
      // Clear the drop target
      if (this._dropTarget) {
        this._dropTarget.parentNode.removeAttribute("dropbefore");
        this._dropTarget.parentNode.removeAttribute("dropafter");
        this._dropTarget = null;
      }
      return;
    }

    this._isbefore = x < ((realcoords.left + realcoords.right) / 2);
    if (shot == this._dropTarget) {
      if (this._isbefore && shot.parentNode.hasAttribute("dropafter")) {
        shot.parentNode.removeAttribute("dropafter");
        shot.parentNode.setAttribute("dropbefore", "true");
      }
      else if (! this._isbefore && shot.parentNode.hasAttribute("dropbefore")) {
        shot.parentNode.removeAttribute("dropbefore");
        shot.parentNode.setAttribute("dropafter", "true");
      }
    }
    else {
      if (this._dropTarget) {
        this._dropTarget.parentNode.removeAttribute("dropbefore");
        this._dropTarget.parentNode.removeAttribute("dropafter");
      }
      this._dropTarget = shot;
      if (this._isbefore)
        shot.parentNode.setAttribute("dropbefore", "true");
      else
        shot.parentNode.setAttribute("dropafter", "true");
    }
  },


  /**
   * Determine the shot cell for a given coordinate, in client space.
   * @param x  the x coordinate in client space
   * @param y  the y coordinate in client space
   * @param realcoords  optional out parameter, receives the coordinates
   *                    of the shot as top, left, bottom, right properties
   * @type nsIDOMHTMLElement
   * @return the table cell for the shot at the given coordinate, or null
   *         if the coordinates do not correspond to a shot
   */
  shotAt: function (x, y, realcoords) {
    var sequences = this.frame.contentDocument.body.childNodes;
    var ITable = Components.interfaces.nsIDOMHTMLTableElement;
    var IRow = Components.interfaces.nsIDOMHTMLTableRowElement;
    var IDiv = Components.interfaces.nsIDOMHTMLDivElement;
    var IBody = Components.interfaces.nsIDOMHTMLBodyElement;

    // Start at one to skip the drop div
    for (var i = 1; i < sequences.length; ++i) {
      var seq = sequences[i];
      if (seq.offsetTop + seq.clientHeight < y)
        continue;

      var table = seq.getElementsByTagName("table")[0];
      var rows = table.lastChild.childNodes;
      for (var j = 0; j < rows.length; ++j) {
        if (! (rows[j] instanceof IRow))
          continue;

        // offsetTop is relative to the table when dealing with rows and cells
        var top = table.offsetTop + rows[j].offsetTop;

        if (top + rows[j].clientHeight < y)
          continue;

        var cells = rows[j].childNodes;
        for (var k = 0; k < cells.length; ++k) {
          var left = table.offsetLeft + cells[k].offsetLeft;
          if (left + cells[k].clientWidth < x)
            continue;
          var shot = cells[k].firstChild;
          if (shot && shot instanceof IDiv && shot.className == "shotcell") {
            if (realcoords) {
              realcoords.top = top;
              realcoords.left = left;
              realcoords.bottom = top + cells[k].clientHeight;
              realcoords.right = left + cells[k].clientWidth;
            }
            return shot;
          }
          else
            dump("*** could not find a shot in the given cell\n");
          break;
        }
        break;
      }
      break;
    }
    return null;
  },


  /**
   * Determine the upper left coordinates for a given table cell.
   * @param cell  a table cell or descendent of one
   * @param outx  receives the X coordinate (out parameter)
   * @param outy  receives the Y coordinate (out parameter)
   * @type boolean
   * @return true if the coordinates were successfully determined, otherwise
   *         the values of outx and outy are unspecified
   */
  getCoordsForCell: function (cell, outx, outy) {
    var ICell = Components.interfaces.nsIDOMHTMLTableCellElement;
    while (cell && ! (cell instanceof ICell))
      cell = cell.parentNode;
    if (! cell)
      return false;

    var x = cell.offsetLeft;
    var row = cell.parentNode;
    var y = row.offsetTop;
    var table = row.parentNode.parentNode; // Don't forget the TBODY element
    y += table.offsetTop;
    x += table.offsetLeft;
    outx.value = x;
    outy.value = y;

    return true;
  },


  scrollToEndOfSequence: function (domseq) {
    if (this.frame.docShell.busyFlags) {
      var self = this;
      setTimeout(function () { self.scrollToEndOfSequence(domseq); }, 100);
      return;
    }

    // Find the corresponding view sequence
    var seqno = 0;
    var prevseq = previousElement(domseq);
    while (prevseq) {
      ++seqno;
      prevseq = previousElement(prevseq);
    }
    // Skip the dropshadow div
    ++seqno;
    // Skip the toolbar at the end too
    if (seqno >= this.frame.contentDocument.body.childNodes.length - 1) {
      dump("*** scrollToEndOfSequence: No cell for dom sequence\n");
      return;
    }
    var seq = this.frame.contentDocument.body.childNodes[seqno];

    // How high above the end of the sequence to scroll to
    var offsetFromBottom = 0;
    var y = seq.offsetTop + seq.clientHeight - offsetFromBottom;
    if (y < 0)
      y = 0;
    this.frame.contentWindow.scrollTo(0, y);
  },


  /**
   * Implementation of nsIDOMEventListener method. This handles clicks,
   * drags, and keyboard input, and dispatches actions accordingly.
   * @param event an nsIDOMEvent
   */
  handleEvent: function handleEvent (event) {
    var IBody = Components.interfaces.nsIDOMHTMLBodyElement;
    var IImg = Components.interfaces.nsIDOMHTMLImageElement;
    var ICell = Components.interfaces.nsIDOMHTMLTableCellElement;
    var ITextArea = Components.interfaces.nsIDOMHTMLTextAreaElement;
    var IInput = Components.interfaces.nsIDOMHTMLInputElement;
    var ISelect = Components.interfaces.nsIDOMHTMLSelectElement;
    var shot = event.target;
    var doc = this.frame.contentDocument;

    while (shot && shot.className != "shotcell")
      shot = shot.parentNode;

    if (event.type == "focus") {
      // Focus events are received when the textarea receives a focus event
      // and invokes the "passEvent" function set on the window, which passes
      // the event here. We do it this way since focus events don't bubble.
      if (shot)
        this.selection = shot;
    }
    else if (event.type == "change" || event.type == "keyup") {
      if (shot && event.target instanceof ITextArea) {
        var realNode = this.shotForCell(shot);
        realNode.setAttribute("title", event.target.value);
        // This depends on the p tag coming right after the textarea
        event.target.nextSibling.firstChild.nodeValue = event.target.value;
        this.modified = true;
        this.treeview.handleEvent(
          { type: "DOMAttrModified", target: realNode }
        );
      }
      else if (shot && event.target instanceof ISelect) {
        var realNode = this.shotForCell(shot);
        realNode.setAttribute("shottype", event.target.value);
        // This depends on the span tag coming right after the textarea
        event.target.nextSibling.firstChild.nodeValue = event.target.value;
        this.modified = true;
      }
      else if (event.target.parentNode.className == "seqheader") {
        var seqdiv = event.target.parentNode.parentNode;
        var domseq = this.sequenceForCell(seqdiv);
        domseq.setAttribute("title", event.target.value);
        // This depends on the p tag coming right after the input
        event.target.nextSibling.firstChild.nodeValue = event.target.value;
        this.modified = true;
        this.treeview.handleEvent(
          { type: "DOMAttrModified", target: domseq }
        );
      }
    }
    else if (event.type == "click") {
      if (! (event.target instanceof IInput) &&
          ! (event.target instanceof IImg) &&
          ! event.target.hasAttribute("action"))
        return;

      switch (event.target.getAttribute("action")) {
        case "addimages":
          var seqdiv = event.target.parentNode.parentNode;
          // seqdiv has a seqnum attribute, so this works
          var domseq = this.sequenceForCell(seqdiv);
          if (domseq) {
            if (this.addImageToSequence(domseq)) {
              this.refreshSequence(domseq);
              this.scrollToEndOfSequence(domseq);
            }
          }
          break;
        case "duplicateshot":
          this.duplicateCell(this.selection);
          this.selection = null;
          break;
        case "deleteshot":
          this.deleteCell(this.selection);
          this.selection = null;
          break;
        case "deletesequence":
          var seq = event.target.parentNode;
          while (seq && seq.className != "sequence")
            seq = seq.parentNode;
          if (seq)
            this.deleteSequence(Number(seq.getAttribute("seqnum")));
          break;
      }
    }
    else if (event.type == "dblclick") {
      if (! shot)
        return;

      if ((event.target instanceof IImg) &&
           event.target.className == "shotimg") {
        // Open the source image, not the thumbnail, in an external viewer
        var realNode = this.shotForCell(shot);
        openExternalFile(fileURLToFile(realNode.getAttribute("image")));
      }
    }
    else if (event.type == "mousedown") {
      if (! shot) {
        this._draggedShot = null;
        return;
      }

      // Establish the selection
      this.selection = shot;

      if (event.target instanceof ITextArea || event.target instanceof IInput) {
        this._draggedShot = null;
        return;
      }

      if (! shot) {
        this._draggedShot = null;
        return;
      }

      var imgs = shot.getElementsByTagName("img");
      for (var i = 0; i < imgs.length; ++i) {
        if (imgs[i].className == "shotimg") {
          this._draggedImage = imgs[i];
          break;
        }
      }
      if (! this._draggedImage)
        return;

      this._draggedShot = shot;
      var x = event.clientX + this.frame.contentWindow.scrollX;
      var y = event.clientY + this.frame.contentWindow.scrollY;

      var imgparent = this._draggedImage.parentNode;
      while (imgparent.className != "imgcontainer" &&
             imgparent.className != "imageBox")
        imgparent = imgparent.parentNode;
      // Since the imgcontainer is a relatively positioned div,
      // its offset is its client position
      imgx = imgparent.offsetLeft;
      imgy = imgparent.offsetTop;

      this._grabX = x - imgx;
      this._grabY = y - imgy;

      window.addEventListener("mouseup", this, false);
      window.addEventListener("mousemove", this, false);
      
      event.preventDefault();
    }
    else if (event.type == "mousemove") {

      this._mouseX = event.screenX;
      this._mouseY = event.screenY;
      this.updateDropShadow();
      this.updateDropTarget();

      // Check if we ought to scroll
      if (! this._scrollTimeout)
        this._scrollTimeout = setTimeout("gController.checkScroll()", 100);
    }
    else if (event.type == "mouseup") {
      window.removeEventListener("mouseup", this, false);
      window.removeEventListener("mousemove", this, false);
      doc.getElementById("dropshadow").setAttribute("hidden", "true");
      if (! this._draggedShot)
        return;
      var draggedShot = this._draggedShot;
      this._draggedShot = null;
      if (! this._dropTarget)
        return;
      this._dropTarget.removeAttribute("dropbefore");
      var realDragNode = this.shotForCell(draggedShot);
      var realDropNode = this.shotForCell(this._dropTarget);
      var oldseq = realDragNode.parentNode;
      var newseq = realDropNode ? realDropNode.parentNode :
        this.sequenceForCell(this._dropTarget);

      if (! this._isbefore)
        realDropNode = nextElement(realDropNode);

      this.selection = null;

      if (realDropNode)
        newseq.insertBefore(realDragNode, realDropNode);
      else
        newseq.appendChild(realDragNode);

      this._dropTarget = null;
      this.refreshSequence(newseq);
      if (oldseq && oldseq != newseq)
        this.refreshSequence(oldseq);
    }
  },


  checkMediaResources: function checkMediaResources () {
    var rdfsvc = getRDFService();
    var ds = this.project.ds;
    var mediamgr = new MediaManager(this.project);

    // Ensure the cx:images sequence off the docres
    var imagesarc = rdfsvc.GetResource(Cx.NS_CX + "media");
    var imageseq = ds.GetTarget(this.docres, imagesarc, true);
    if (! imageseq) {
      imageseq = rdfsvc.GetAnonymousResource();
      ds.Assert(this.docres, imagesarc, imageseq, true);
    }
    this.images = new RDFSeq(ds, imageseq);

    // Ensure an imageres attribute wherever it's lacking, and make sure
    // the imageres is the correct one for its position (this will be
    // incorrect after a copy)
    var shots = this.storydom.documentElement.getElementsByTagName("shot");
    for (var i = 0; i < shots.length; ++i) {
      if (shots[i].hasAttribute("imageres") &&
          shots[i].hasAttribute("imageno")) {
        try {
          var imagenum = Number(shots[i].getAttribute("imageno"));
          var imageres = this.images.get(imagenum).QueryInterface(
            Components.interfaces.nsIRDFResource);
          if (shots[i].getAttribute("imageres") != imageres.Value)
            shots[i].setAttribute("imageres", imageres.Value);
        }
        catch (ex) {
          dump("*** checkMediaResources: " + ex + "\n");
        }
        continue;
      }
      var imageres = mediamgr.createMediaForExistingFilename(
        shots[i].getAttribute("image"));
      this.images.push(imageres);
      shots[i].setAttribute("imageres", imageres.Value);
      shots[i].setAttribute("imageno", this.images.indexOf(imageres));
    }
  },


  resolveImageAttributes: function resolveImageAttributes () {
    var mediamgr = new MediaManager(this.project);
    var rdfsvc = getRDFService();
    var shots = this.storydom.documentElement.getElementsByTagName("shot");
    for (var i = 0; i < shots.length; ++i) {
      var shot = shots[i];
      if (! shot.hasAttribute("imageres")) {
        dump("*** resolveImageAttributes: missing imageres on shot\n");
        continue;
      }
      try {
        var imageres = rdfsvc.GetResource(shot.getAttribute("imageres"));
        shot.setAttribute("image", mediamgr.uriForMedia(imageres));
        var callback = function (thumbnail) {
          if (thumbnail)
            shot.setAttribute("thumbnail", fileToFileURL(thumbnail));
          else
            dump("*** resolveImageAttributes: getThumbnail failed!\n");
        };
        mediamgr.getThumbnail(imageres, true, 256, 192, callback);
      }
      catch (ex) {
        dump("*** resolveImageAttributes: " + ex + "\n");
      }
    }
  },


  refresh: function refresh () {
    this.selection = null;
    var xslt = document.implementation.createDocument("", "", null);
    xslt.async = false;
    if (this.columns == 1)
      xslt.load(Cx.TRANSFORM_PATH + "storyboard1col.xml");
    else
      xslt.load(Cx.TRANSFORM_PATH + "storyboard.xml");
    var proc = new XSLTProcessor();
    proc.importStylesheet(xslt);
    if (this.columns != 1)
      proc.setParameter(null, "columns", this.columns);
    var shotwords = getPrefString(
      getPrefService().getBranch("celtx.scripteditor."), "shots")
      .split(",").join("|") + "|";
    proc.setParameter(null, "shotwords", shotwords);
    var doc = proc.transformToDocument(this.storydom);
    serializeDOMtoFile(doc, this.reportFile);
    this.frame.webNavigation.loadURI(fileToFileURL(this.reportFile),
      Components.interfaces.nsIWebNavigation.LOAD_FLAGS_BYPASS_CACHE,
      null, null, null);
    var self = this;
    var addListeners = function () {
      if (self.frame.docShell.busyFlags)
        setTimeout(addListeners, 100);
      else {
        var doc = self.frame.contentDocument.documentElement;
        doc.addEventListener("mousedown", self, false);
        doc.addEventListener("click", self, false);
        doc.addEventListener("dblclick", self, false);
        doc.addEventListener("change", self, false);
        doc.addEventListener("keyup", self, false);
        self.frame.contentWindow.passEvent = function (event) {
          self.handleEvent(event);
        }
      }
    };
    setTimeout(addListeners, 100);
  },


  refreshSequence: function (domseq) {
    var xslt = document.implementation.createDocument("", "", null);
    xslt.async = false;
    if (this.columns == 1)
      xslt.load(Cx.TRANSFORM_PATH + "storyboard1col.xml");
    else
      xslt.load(Cx.TRANSFORM_PATH + "storyboard.xml");
    var proc = new XSLTProcessor();
    proc.importStylesheet(xslt);
    if (this.columns != 1)
      proc.setParameter(null, "columns", this.columns);
    var shotwords = getPrefString(
      getPrefService().getBranch("celtx.scripteditor."), "shots")
      .split(",").join("|") + "|";
    proc.setParameter(null, "shotwords", shotwords);

    // Handle text nodes between sequence elements in the DOM
    var seqno = 0;
    var prevseq = previousElement(domseq);
    while (prevseq) {
      ++seqno;
      prevseq = previousElement(prevseq);
    }
    proc.setParameter(null, "seqoffset", seqno);
    var doc = this.frame.contentDocument;
    var newseq = proc.transformToFragment(domseq, doc);
    // Don't forget the drop shadow div when getting the index!
    ++seqno;
    // Don't replace the toolbar either!
    if (seqno >= doc.body.childNodes.length - 1)
      doc.body.insertBefore(newseq, doc.body.lastChild);
    else
      doc.body.replaceChild(newseq, doc.body.childNodes[seqno]);

    this.checkSelection();
  },


  // Maps model to view
  cellForShot: function cellForShot (shot) {
    if (! shot || shot.localName != "shot")
      return null;
    var cellpos = 1;
    var prev = previousElement(shot);
    while (prev) {
      ++cellpos;
      prev = previousElement(prev);
    }
    var seqpos = 1;
    var seq = previousElement(shot.parentNode);
    while (seq) {
      ++seqpos;
      seq = previousElement(seq);
    }

    // Note: Since the first element in the body is the drop shadow,
    // we can use the 1-based index directly.
    var seqdiv = this.frame.contentDocument.body.childNodes[seqpos];
    var cells = seqdiv.getElementsByTagName("td");
    for (var i = 0; i < cells.length; ++i) {
      var cell = cells[i].firstChild;
      if (! cell || cell.className != "shotcell") continue;
      if (cell.getAttribute("shotnum") == cellpos)
        return cell;
    }
    return null;
  },


  // Maps view to model parent sequence
  sequenceForCell: function sequenceForCell (cell) {
    if (! cell) {
      celtxBugAlert("Null cell in sequenceForCell", Components.stack, null);
      return null;
    }
    var seqnum = cell.getAttribute("seqnum");
    var str = "/storyboard/sequence[position() = " + seqnum + "]";
    var xpath = new XPathEvaluator();
    var xset = xpath.evaluate(str, this.storydom, null,
      XPathResult.FIRST_ORDERED_NODE_TYPE, null);
    return xset.singleNodeValue;
  },


  // Maps view to model
  shotForCell: function shotForCell (cell) {
    if (! cell) {
      celtxBugAlert("Null cell in shotForCell", Components.stack, null);
      return null;
    }
    var seqnum = cell.getAttribute("seqnum");
    var shotnum = cell.getAttribute("shotnum");
    var str = "/storyboard/sequence[position() = " + seqnum
      + "]/shot[position() = " + shotnum + "]";
    var xpath = new XPathEvaluator();
    var xset = xpath.evaluate(str, this.storydom, null,
      XPathResult.FIRST_ORDERED_NODE_TYPE, null);
    return xset.singleNodeValue;
  },


  addImageToSequence: function (sequence) {
    var mediamgr = new MediaManager(this.project);
    var files = mediamgr.showMediaPicker("image", true);
    if (! files)
      return false;

    var self = this;
    var progressListener = {
      controller: self,
      filelist: files,
      mediamgr: mediamgr,
      finished: false,
      cancelled: false,
      current: -1,
      waiting: false,
      sequence: sequence,
      message: gApp.getText("GeneratingThumbnailsMsg"),
      shots: [],


      get progress () {
        if (this.current < 0)
          return 0;

        return Math.floor((this.current * 100) / this.filelist.length);
      },


      performNextTask: function () {
        // Waiting for thumbnail generation callback
        if (this.waiting)
          return true;

        // Add all the images
        if (++this.current >= this.filelist.length) {
          while (this.shots.length > 0) {
            var shot = this.shots.shift();
            this.sequence.appendChild(shot);
            this.controller.treeview.handleEvent(
              { type: "DOMNodeInserted", target: shot });
          }
          this.finished = true;
          return true;
        }

        var i = this.current;
        var imageres = this.mediamgr.addMediaFromFile(this.filelist[i]);
        this.controller.images.push(imageres);

        var shot = this.controller.storydom.createElement("shot");
        shot.setAttribute("ratio", "4x3");
        shot.setAttribute("title", this.filelist[i].leafName);
        shot.setAttribute("image", this.mediamgr.uriForMedia(imageres));
        shot.setAttribute("imageres", imageres.Value);
        shot.setAttribute("imageno", this.controller.images.indexOf(imageres));
        this.shots.push(shot);

        this.waiting = true;
        var listener = this;
        var callback = function (thumbnail) {
          if (listener.cancelled) return;

          listener.waiting = false;

          if (thumbnail)
            shot.setAttribute("thumbnail", fileToFileURL(thumbnail));
          else
            dump("*** generating thumbnail failed\n");
        };
        this.mediamgr.getThumbnail(imageres, true, 256, 192, callback);
        return true;
      },


      abort: function () {
        this.cancelled = true;
      }
    };

    openDialog(Cx.CONTENT_PATH + "progress.xul", "_blank",
      Cx.MODAL_DIALOG_FLAGS, progressListener);

    this.modified = true;

    return true;
  },


  duplicateCell: function (cell) {
    var shot = this.shotForCell(cell);
    shot.parentNode.insertBefore(shot.cloneNode(true), shot.nextSibling);
    this.modified = true;
    this.refreshSequence(shot.parentNode);
  },


  deleteCell: function deleteCell (cell) {
    var shot = this.shotForCell(cell);
    if (! shot)
      return;
    this.treeview.handleEvent(
      { type: "DOMNodeRemoved", target: shot }
    );
    var domseq = shot.parentNode;
    domseq.removeChild(shot);
    this.treeview.handleEvent(
      { type: "DOMNodeWasRemoved", target: shot }
    );
    this.modified = true;
    this.refreshSequence(domseq);
  },


  addSequence: function addSequence () {
    this.selection = null;

    var seq = this.storydom.createElement("sequence");
    seq.id = generateID();
    seq.setAttribute("title", gApp.getText("Untitled"));
    this.storydom.documentElement.appendChild(seq);
    var seqs = this.storydom.getElementsByTagName("sequence");
    if (seqs.length == 1) {
      this.startSeq = 1;
      this.startRow = 1;
    }
    else {
      var prevseq = seqs[seqs.length - 2];
      var shots = prevseq.getElementsByTagName("shot");
      var rows = Math.ceil(shots.length / 3);
      this.startSeq = seqs.length - 1;
      this.startRow = rows;
    }
    this.treeview.handleEvent(
      { type: "DOMNodeInserted", target: seq }
    );
    this.modified = true;
    this.refreshSequence(seq);
    this.frame.contentWindow.scrollTo(0, this.frame.contentWindow.scrollMaxY);
  },


  deleteSequence: function deleteSequence (seqnum) {
    this.selection = null;

    var str = "/storyboard/sequence[position() = " + seqnum + "]";
    var xpath = new XPathEvaluator();
    var xset = xpath.evaluate(str, this.storydom, null,
      XPathResult.FIRST_ORDERED_NODE_TYPE, null);
    var seq = xset.singleNodeValue;
    var ps = getPromptService();
    if (! ps.confirm(window, gApp.getText("DeleteSequence"),
      gApp.getText("DeleteSequencePrompt", [ seq.getAttribute("title") ])))
      return;
    this.treeview.handleEvent(
      { type: "DOMNodeRemoved", target: seq }
    );
    var prevseq = previousElement(seq);
    seq.parentNode.removeChild(seq);
    this.treeview.handleEvent(
      { type: "DOMNodeWasRemoved", target: seq }
    );
    this.modified = true;
    this.refresh();
    if (prevseq)
      this.scrollToEndOfSequence(prevseq);
  },


  slideshow: function slideshow () {
    openDialog(Cx.CONTENT_PATH + "editors/storyboardplay.xul", "_blank",
      Cx.NEW_WINDOW_FLAGS, this.storydom, this.project);
  },


  keypress: function keypress (event) {
    if (! this.selection)
      return;
    if (event.keyCode != event.DOM_VK_BACK_SPACE &&
        event.keyCode != event.DOM_VK_DELETE)
      return;

    var shot = this.shotForCell(this.selection);
    if (! shot)
      return;
    this.treeview.handleEvent(
      { type: "DOMNodeRemoved", target: shot }
    );
    shot.parentNode.removeChild(shot);
    this.treeview.handleEvent(
      { type: "DOMNodeWasRemoved", target: shot }
    );
    this.modified = true;
    this.refresh();
  },


  click: function click (event) {
    if (event.target.localName == "shotcell" &&
        event.originalTarget.localName == "label") {
      this.selection = event.target;
      event.target.editlabel.setEditable(true);
      return;
    }
    if (event.target.localName != "shotcell" ||
        this.selection == event.target)
      return;
    if (this.selection)
      this.selection.removeAttribute("selected");
    this.selection = event.target;
    this.selection.setAttribute("selected", true);
    if (event.originalTarget.localName != "description")
      event.target.focus();
  },


  treeMoveUp: function () {
    var idx = this.treeview.selection.currentIndex;
    if (idx < 0)
      return;
    var node = this.treeview.rowToNode(idx);
    var seq = node.nodeName == "sequence" ? node : node.parentNode;
    var prev = previousElement(node);
    if (! prev)
      return;
    node.parentNode.insertBefore(node, prev);
    this.refreshSequence(seq);
    if (prev.nodeName == "sequence")
      this.refreshSequence(prev);
    if (node.nodeName == "sequence") {
      var previdx = idx - 1;
      while (this.treeview.getLevel(previdx) != 0)
        --previdx;
      var nextidx = idx + 1;
      var maxrow = this.treeview.rowCount - 1;
      while (nextidx <= maxrow && this.treeview.getLevel(nextidx) != 0)
        ++nextidx;
      this.treeview.treebox.invalidateRange(previdx, nextidx - 1);
      this.treeview.selection.select(previdx);
    }
    else {
      this.treeview.treebox.invalidateRow(idx - 1);
      this.treeview.treebox.invalidateRow(idx);
      this.treeview.selection.select(idx - 1);
    }
    this.modified = true;
  },


  treeMoveDown: function () {
    var idx = this.treeview.selection.currentIndex;
    if (idx < 0)
      return;
    var node = this.treeview.rowToNode(idx);
    var seq = node.nodeName == "sequence" ? node : node.parentNode;
    var next = nextElement(node);
    if (! next)
      return;
    // insertBefore(node, null) is equivalent to appendChild(node)
    node.parentNode.insertBefore(node, nextElement(next));
    this.refreshSequence(seq);
    if (next.nodeName == "sequence")
      this.refreshSequence(next);
    if (node.nodeName == "sequence") {
      var nextidx = idx + 1;
      var maxrow = this.treeview.rowCount - 1;
      while (nextidx <= maxrow && this.treeview.getLevel(nextidx) != 0)
        ++nextidx;
      var lastidx = nextidx + 1;
      while (lastidx <= maxrow && this.treeview.getLevel(lastidx) != 0)
        ++lastidx;
      this.treeview.treebox.invalidateRange(idx, lastidx - 1);
      this.treeview.selection.select(nextidx);
    }
    else {
      this.treeview.treebox.invalidateRow(idx);
      this.treeview.treebox.invalidateRow(idx + 1);
      this.treeview.selection.select(idx + 1);
    }
    this.modified = true;
  }
};


var gDragController = {
  // Modified version of nsDragAndDrop.startDrag with additional |dragrect|
  // field for specifying the drag rect in the |action| parameter
  startDrag: function (aEvent) {
    const kDSIID = Components.interfaces.nsIDragService;
    var dragAction = {
      action: kDSIID.DRAGDROP_ACTION_COPY |
              kDSIID.DRAGDROP_ACTION_MOVE |
              kDSIID.DRAGDROP_ACTION_LINK,
      dragrect: null
    };
    var transferData = { data: null };
    try {
      this.onDragStart(aEvent, transferData, dragAction);
    }
    catch (ex) { return; }
    if (! transferData.data) return;
    transferData = transferData.data;

    var transArray = createSupportsArray();
    var count = 0;
    do {
      var trans = nsTransferable.set(transferData._XferID == "TransferData"
        ? transferData : transferData.dataList[count++]);
      transArray.AppendElement(trans.QueryInterface(
        Components.interfaces.nsISupports));
    }
    while (transferData.XferID == "TransferDataSet" &&
           count < transferData.dataList.length);
    try {
      nsDragAndDrop.mDragService.invokeDragSession(aEvent.target, transArray,
        dragAction.dragrect, dragAction.action);
    }
    catch (ex) {}
    aEvent.stopPropagation();
  },


  onDragStart: function (event, xferData, action) {
    var target = event.target;
    if (target.localName != "shotcell")
      return;

    xferData.data = new TransferData();
    xferData.data.addDataForFlavour("text/unicode",
      target.getAttribute("image"));

    var region = Components.classes["@mozilla.org/gfx/region;1"]
      .createInstance(Components.interfaces.nsIScriptableRegion);
    region.init();
    var bo = target.boxObject;
    region.setToRect(bo.x, bo.y, bo.width, bo.height);
    action.dragrect = region;
  },


  onDragOver: function (event, flavour, session) {
    if (event.target.localName != "shotcell" &&
        event.target.localName != "shotholder")
      return;

    try {
      var seq = gController.sequenceForCell(event.target);
      var shot = gController.shotForCell(session.sourceNode);
      var before = null;
      if (event.target.localName == "shotcell") {
        var before = gController.shotForCell(event.target);
        var box = event.target.boxObject;
        if (event.screenX > (box.screenX + box.width / 2))
          before = nextElement(before);
      }
      if (before && before == gController.shotForCell(event.target)) {
        event.target.setAttribute("dropbefore", "true");
        event.target.removeAttribute("dropafter", "true");
      }
      else {
        event.target.removeAttribute("dropbefore", "true");
        event.target.setAttribute("dropafter", "true");
      }
    }
    catch (ex) {
      dump("*** onDrop: " + ex + "\n");
    }
  },


  onDragExit: function (event, session) {
    if (event.target.hasAttribute("dropbefore"))
      event.target.removeAttribute("dropbefore");
  },


  onDrop: function (event, xferData, session) {
    // Only allow local drops
    if (! (session.sourceNode && session.sourceNode.localName == "shotcell")) {
      dump("*** no sourceNode (or non-shotcell sourceNode)\n");
      return;
    }

    if (event.target.localName != "shotcell" &&
        event.target.localName != "shotholder")
      return;

    gController.selection = null;

    try {
      var seq = gController.sequenceForCell(event.target);
      var shot = gController.shotForCell(session.sourceNode);
      var before = null;
      if (event.target.localName == "shotcell") {
        var before = gController.shotForCell(event.target);
        var box = event.target.boxObject;
        if (event.screenX > (box.screenX + box.width / 2))
          before = nextElement(before);
      }
      gController.treeview.handleEvent(
        { type: "DOMNodeMoving", target: shot }
      );
      if (before)
        seq.insertBefore(shot, before);
      else
        seq.appendChild(shot);
      gController.treeview.handleEvent(
        { type: "DOMNodeMoved", target: shot }
      );
      gController.modified = true;
      gController.refresh();
      gController.treeview.treebox.invalidate();
    }
    catch (ex) {
      dump("*** onDrop: " + ex + "\n");
    }
  },


  getSupportedFlavours: function () {
    if (! this._flavours) {
      this._flavours = new FlavourSet();
      // this._flavours.appendFlavour("x-celtx/x-image");
      this._flavours.appendFlavour("text/unicode");
    }
    return this._flavours;
  }
};

function onDeleteCell (event) {
  var cell = event.target;
  while (cell && cell.localName != "shotcell")
    cell = cell.parentNode;
  if (! cell) {
    dump("*** onDeleteCell: no shotcell in hierarchy\n");
    return;
  }
  gController.deleteCell(cell);
}


function StoryboardTree (controller) {
  this.controller = controller;
  this.dragsvc = Components.classes["@mozilla.org/widget/dragservice;1"]
    .getService(Components.interfaces.nsIDragService);
}


StoryboardTree.prototype = {
  QueryInterface: function (iid) {
    if (iid.equals(Components.interfaces.nsISupports) ||
        iid.equals(Components.interfaces.nsIDOMEventListener) ||
        iid.equals(Components.interfaces.nsITreeView))
      return this;
    throw Components.results.NS_ERROR_NO_INTERFACE;
  },


  toggleMap: {},


  DROP_BEFORE: Components.interfaces.nsITreeView.DROP_BEFORE,
  DROP_ON: Components.interfaces.nsITreeView.DROP_ON,
  DROP_AFTER: Components.interfaces.nsITreeView.DROP_AFTER,
  PROGRESS_NORMAL: Components.interfaces.nsITreeView.PROGRESS_NORMAL,
  PROGRESS_UNDETERMINED:
    Components.interfaces.nsITreeView.PROGRESS_UNDETERMINED,
  PROGRESS_NONE: Components.interfaces.nsITreeView.PROGRESS_NONE,


  handleEvent: function (event) {
    switch (event.type) {
      case "DOMAttrModified":
        var row = this.nodeToRow(event.target);
        if (row >= 0) {
          // this.treebox.invalidateRow(row);
          this.treebox.invalidate();
        }
        break;
      case "DOMNodeInserted":
        var row = this.nodeToRow(event.target);
        if (row >= 0)
          this.treebox.rowCountChanged(row, 1);
        this.treebox.invalidate();
        break;
      case "DOMNodeRemoved":
        var row = this.nodeToRow(event.target);
        if (row >= 0) {
          var count = 1;
          if (event.target.localName == "sequence" &&
              this.toggleMap[event.target.id])
            count += event.target.getElementsByTagName("shot");
          this._deleteRow = row;
          this._deleteCount = -count;
        }
        else {
          this._deleteRow = -1;
        }
        break;
      case "DOMNodeWasRemoved":
        if (this._deleteRow >= 0) {
          this.treebox.rowCountChanged(this._deleteRow, this._deleteCount);
          this.treebox.invalidate();
        }
        break;
      case "DOMNodeMoving":
        this._movingParent = event.target.parentNode;
        this._movingRow = this.nodeToRow(event.target);
        break;
      case "DOMNodeMoved":
        if (this._movingParent != event.target.parentNode) {
          // Change the row count if it moved from an open sequence
          // to a closed one or vice versa.
          if (this.toggleMap[this._movingParent.id] !=
              this.toggleMap[event.target.parentNode.id]) {
            if (this.toggleMap[this._movingParent.id])
              this.treebox.rowCountChanged(this._movingRow, -1);
            else
              this.treebox.rowCountChanged(this.nodeToRow(event.target), 1);
          }
        }
        this.treebox.invalidate();
        break;
      case "select":
        if (this._suppressSelectEvents)
          return;

        if (this.selection.count != 1)
          return;

        var node = this.rowToNode(this.selection.currentIndex);
        if (node.localName != "shot")
          return;

        var cell = gController.cellForShot(node);
        if (cell) {
          this._suppressSelectEvents = true;
          gController.selection = cell;
          this._suppressSelectEvents = false;
        }
        break;
      case "dblclick":
        if (this._suppressSelectEvents)
          return;

        var node = this.rowToNode(this.selection.currentIndex);
        if (node.localName == "sequence") {
          // Find the corresponding view sequence
          var seqno = 0;
          var prevseq = previousElement(node);
          while (prevseq) {
            ++seqno;
            prevseq = previousElement(prevseq);
          }
          // Skip the dropshadow div
          ++seqno;
          var frame = gController.frame;
          if (seqno >= frame.contentDocument.body.childNodes.length) {
            dump("*** dblclick: No cell for dom sequence\n");
            return;
          }
          var seq = frame.contentDocument.body.childNodes[seqno];
          frame.contentWindow.scrollTo(0, seq.offsetTop);
        }
        if (node.localName != "shot")
          return;

        var cell = gController.cellForShot(node);
        var coords = { x: { value: -1}, y: { value: -1 } };
        if (! gController.getCoordsForCell(cell, coords.x, coords.y))
          return;

        gController.frame.contentWindow.scrollTo(0, coords.y.value);
        break;
      case "draggesture":
        if (event.originalTarget.localName == "treechildren")
          nsDragAndDrop.startDrag(event, this);
        break;
    }
  },


  rowToNode: function (row) {
    var seqs = this.controller.storydom.getElementsByTagName("sequence");
    var remaining = row;
    for (var i = 0; i < seqs.length; ++i) {
      if (remaining < 0)
        return null;

      if (remaining == 0)
        return seqs[i];

      --remaining;

      if (this.toggleMap[seqs[i].id]) {
        var shots = seqs[i].getElementsByTagName("shot");
        if (remaining < shots.length)
          return shots[remaining];
        remaining -= shots.length;
      }
    }
    return null;
  },


  nodeToRow: function (node) {
    var seq = node;
    if (node.localName == "shot")
      seq = node.parentNode;
    var seqs = this.controller.storydom.getElementsByTagName("sequence");
    var row = 0;
    for (var i = 0; i < seqs.length; ++i) {
      if (seq == seqs[i])
        break;
      row += 1;
      if (this.toggleMap[seqs[i].id])
        row += seqs[i].getElementsByTagName("shot").length;
    }
    if (seq == node)
      return row;
    if (! this.toggleMap[seq.id])
      return -1;
    var shots = seq.getElementsByTagName("shot");
    for (var i = 0; i < shots.length; ++i) {
      row += 1;
      if (node == shots[i])
        return row;
    }
    return -1;
  },


  get rowCount () {
    var dom = this.controller.storydom;
    var seqs = dom.getElementsByTagName("sequence");
    var count = 0;
    for (var i = 0; i < seqs.length; ++i) {
      ++count;
      if (this.toggleMap[seqs[i].id])
        count += seqs[i].getElementsByTagName("shot").length;
    }
    return count;
  },


  getCellText: function (row,column) {
    var node = this.rowToNode(row);
    if (! node)
      return "";
    var title = node.getAttribute("title");
    var cursor = node;
    var count = 1;
    while (cursor = previousElement(cursor))
      ++count;
    title = count + ". " + title;
    if (node.localName == "shot") {
      count = 1;
      cursor = node.parentNode;
      while (cursor = previousElement(cursor))
        ++count;
      title = count + "." + title;
    }
    return title;
  },


  setTree: function (treebox) {
    if (this.treebox && this.treebox.treeBody) {
      var tree = this.treebox.treeBody.parentNode;
      while (tree && tree.localName != "tree")
        tree = tree.parentNode;
      tree.removeEventListener("select", this, false);
      this.treebox.treeBody.removeEventListener("dblclick", this, false);
      this.treebox.treeBody.removeEventListener("draggesture", this, false);
    }
    this.treebox = treebox;
    if (treebox) {
      var tree = this.treebox.treeBody.parentNode;
      while (tree && tree.localName != "tree")
        tree = tree.parentNode;
      tree.addEventListener("select", this, false);
      treebox.treeBody.addEventListener("dblclick", this, false);
      treebox.treeBody.addEventListener("draggesture", this, false);
    }
  },


  isContainer: function (row) {
    var node = this.rowToNode(row);
    if (node && node.localName == "sequence")
      return true;
    return false;
  },


  isContainerOpen: function (row) {
    var node = this.rowToNode(row);
    if (node && node.localName == "sequence") {
      return this.toggleMap[node.id] == true;
    }
    return false;
  },


  isContainerEmpty: function (row) {
    var node = this.rowToNode(row);
    if (node && node.localName == "sequence") {
      return node.getElementsByTagName("shot").length == 0;
    }
    return true;
  },


  getLevel: function (row) {
    return this.isContainer(row) ? 0 : 1;
  },


  getParentIndex: function (row) {
    var node = this.rowToNode(row);
    if (! node || node.localName == "sequence")
      return -1;
    var index = row - 1;
    while (node = previousElement(node))
      --index;
    return index;
  },


  hasNextSibling: function (row, afterIndex) {
    var node = this.rowToNode(row);
    if (! node)
      return false;
    var sibling = this.rowToNode(afterIndex + 1);
    if (! sibling)
      return false;
    return node.parentNode == sibling.parentNode;
  },


  toggleOpenState: function (row) {
    var node = this.rowToNode(row);
    if (! node || node.localName != "sequence") {
      dump("*** toggleOpenState: invalid node\n");
      return;
    }
    var rows = node.getElementsByTagName("shot").length;
    if (this.toggleMap[node.id]) {
      this.toggleMap[node.id] = false;
      this.treebox.rowCountChanged(row + 1, -rows);
    }
    else {
      this.toggleMap[node.id] = true;
      this.treebox.rowCountChanged(row + 1, rows);
    }
    this.treebox.invalidate();
  },


  isSeparator: function (row) { return false; },
  isSorted: function () { return false; },
  getImageSrc: function (row,col) { return null; },
  getRowProperties: function (row,props) {},
  getCellProperties: function (row,col,props) {},
  getColumnProperties: function (colid,col,props) {},


  onDragStart: function onDragStart (aEvent, aXferData, aDragAction) {
    if (this.selection.count != 1)
      return;
    var data = new TransferData();
    data.addDataForFlavour("x-celtx/x-treerow", this.selection.currentIndex);
    aXferData.data = data;
  },


  canDrop: function (row, orientation) {
    var dragSession = this.dragsvc.getCurrentSession();
    if (! dragSession)
      return false;

    var dstnode = this.rowToNode(row);
    if (! dstnode)
      return false;

    if (dragSession.numDropItems != 1 ||
        ! dragSession.isDataFlavorSupported("x-celtx/x-treerow"))
      return false;

    var trans = Components.classes["@mozilla.org/widget/transferable;1"]
      .createInstance(Components.interfaces.nsITransferable);
    trans.addDataFlavor("x-celtx/x-treerow");
    dragSession.getData(trans, 0);
    var data = {};
    var len = {};
    trans.getTransferData("x-celtx/x-treerow", data, len);
    data = data.value.QueryInterface(Components.interfaces.nsISupportsString);
    if (! data)
      return false;
    data = data.data.substring(0, len.value);

    var srcnode = this.rowToNode(data);
    if (! srcnode)
      return false;

    if (srcnode == dstnode)
      return false;
    // Moving a whole sequence?
    if (srcnode.localName == "sequence") {
      return dstnode.localName == "sequence" && orientation != this.DROP_ON;
    }
    // Moving just a shot
    else {
      if (dstnode.localName == "sequence") {
        return dstnode != srcnode.parentNode && orientation == this.DROP_ON;
      }
      else
        return orientation != this.DROP_ON;
    }
  },


  drop: function (row, orientation) {
    var dragSession = this.dragsvc.getCurrentSession();
    if (! dragSession)
      return;

    var dstnode = this.rowToNode(row);
    if (! dstnode)
      return;

    if (dragSession.numDropItems != 1 ||
        ! dragSession.isDataFlavorSupported("x-celtx/x-treerow"))
      return;

    var trans = Components.classes["@mozilla.org/widget/transferable;1"]
      .createInstance(Components.interfaces.nsITransferable);
    trans.addDataFlavor("x-celtx/x-treerow");
    dragSession.getData(trans, 0);
    var data = {};
    var len = {};
    trans.getTransferData("x-celtx/x-treerow", data, len);
    data = data.value.QueryInterface(Components.interfaces.nsISupportsString);
    if (! data)
      return;
    data = data.data.substring(0, len.value);

    var srcnode = this.rowToNode(data);
    if (! srcnode)
      return;

    if (srcnode == dstnode)
      return;

    var srcseq = null;
    var dstseq = null;

    // Moving a whole sequence?
    if (srcnode.localName == "sequence") {
      if (dstnode.localName == "sequence" && orientation != this.DROP_ON) {
        gController.selection = null;
        this.treebox.beginUpdateBatch();

        if (orientation == this.DROP_BEFORE)
          dstnode.parentNode.insertBefore(srcnode, dstnode);
        else {
          var next = nextElement(dstnode);
          if (next)
            dstnode.parentNode.insertBefore(srcnode, next);
          else
            dstnode.parentNode.appendChild(srcnode);
        }

        this.treebox.endUpdateBatch();
      }
      else
        return;

      srcseq = srcnode;
      dstseq = dstnode;
    }
    // Moving just a shot
    else {
      srcseq = srcnode.parentNode;

      if (dstnode.localName == "sequence") {
        if (dstnode != srcnode.parentNode && orientation == this.DROP_ON) {
          gController.selection = null;
          this.treebox.beginUpdateBatch();
          dstnode.appendChild(srcnode);
        this.treebox.endUpdateBatch();
        }
        else
          return;

        dstseq = dstnode;
      }
      else if (orientation != this.DROP_ON) {
        gController.selection = null;
        this.treebox.beginUpdateBatch();

        dstseq = dstnode.parentNode;

        if (orientation == this.DROP_BEFORE) {
          dstnode.parentNode.insertBefore(srcnode, dstnode);
        }
        else {
          var next = nextElement(dstnode);
          if (next)
            dstnode.parentNode.insertBefore(srcnode, next);
          else
            dstnode.parentNode.appendChild(srcnode);
        }

        this.treebox.endUpdateBatch();
      }
      else
        return;
    }

    this.controller.modified = true;

    this.treebox.invalidate();
    // Moved sequences, need to update the full range
    if (srcseq == srcnode) {
      this.controller.refresh();
    }
    else {
      this.controller.refreshSequence(srcseq);
      if (srcseq != dstseq)
        this.controller.refreshSequence(dstseq);
    }
  }
};
