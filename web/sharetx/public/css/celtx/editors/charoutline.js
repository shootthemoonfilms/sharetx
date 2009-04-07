var gWindow = new Object();

function loaded () {
  gWindow.charcols = document.getElementById("charcols");
  gWindow.charrows = document.getElementById("charrows");
}

function cellsPerRow () {
  return gWindow.charcols.childNodes.length;
}

var gController = {
  commands: {},
  supportsCommand: function (cmd) { return false; },
  isCommandEnabled: function (cmd) { return false; },
  doCommand: function (cmd) {},


  open: function (project, docres) {
    this.docres = docres;
    this.project = project;
    var rdfsvc = getRDFService();
    var IRes = Components.interfaces.nsIRDFResource;
    var charsarc = rdfsvc.GetResource(Cx.NS_CX + "characters");
    /*
    var file = project.fileForResource(docres);
    if (file) {
      this.ds = rdfsvc.GetDataSourceBlocking(fileToFileURL(file));
    }
    else {
      this.ds = getInMemoryDataSource();
      var seqres = rdfsvc.GetAnonymousResource();
      this.ds.Assert(docres, charsarc, seqres, true);
    }
    */
    var seq = project.ds.GetTarget(docres, charsarc, true);
    if (! seq) {
      seq = rdfsvc.GetAnonymousResource();
      project.ds.Assert(docres, charsarc, seq, true);
    }
    seq = seq.QueryInterface(IRes);
    this.charseq = new RDFSeq(project.ds, seq);

    var chars = this.charseq.toArray();
    var currow = null;
    for (var i = 0; i < chars.length; ++i) {
      var charres = chars[i].QueryInterface(IRes);
      var charcard = this.createCharCard(charres);
      if (! currow) {
        currow = document.createElementNS(Cx.NS_XUL, "row");
        gWindow.charrows.appendChild(currow);
      }
      currow.appendChild(charcard);
      if (currow.childNodes.length == cellsPerRow())
        currow = null;
    }
  },


  createCharCard: function (res) {
    var rdfsvc = getRDFService();
    var titlearc = rdfsvc.GetResource(Cx.NS_DC + "title");
    var descarc = rdfsvc.GetResource(Cx.NS_DC + "description");
    var imagearc = rdfsvc.GetResource(Cx.NS_CX + "image");
    var title = getRDFString(this.project.ds, res, titlearc);
    var desc = getRDFString(this.project.ds, res, descarc);
    var image = getRDFString(this.project.ds, res, imagearc);
    if (image == "")
      image = "chrome://celtx/skin/celtx.png";
    var card = document.createElementNS(Cx.NS_XUL, "charactercard");
    card.setAttribute("id", res.Value);
    card.setAttribute("label", title);
    card.setAttribute("description", desc);
    card.setAttribute("image", image);
    return card;
  },


  close: function () {},
  focus: function () {},
  blur: function () {},
  save: function () {},
  modified: false
};

function getController () {
  return gController;
}

function cmdAddCharacter () {
  var ds = gController.project.ds;

  var rdfsvc = getRDFService();
  var rdftypearc = rdfsvc.GetResource(Cx.NS_RDF + "type");
  var rdftype = rdfsvc.GetResource(Cx.NS_CX + "Document");
  var doctypearc = rdfsvc.GetResource(Cx.NS_CX + "doctype");
  var doctype = rdfsvc.GetResource(Cx.NS_CX + "CharacterDocument");
  var titlearc = rdfsvc.GetResource(Cx.NS_DC + "title");
  var titlelit = rdfsvc.GetLiteral(gApp.getText("Untitled"));

  try {
    var docres = rdfsvc.GetResource(gController.project.mintURI());
    ds.Assert(docres, rdftypearc, rdftype, true);
    ds.Assert(docres, doctypearc, doctype, true);
    ds.Assert(docres, titlearc, titlelit, true);
    gController.charseq.push(docres);
    var card = gController.createCharCard(docres);
    var row = gWindow.charrows.lastChild;
    if (! row || row.childNodes.length == cellsPerRow()) {
      row = document.createElementNS(Cx.NS_XUL, "row");
      gWindow.charrows.appendChild(row);
    }
    row.appendChild(card);
  }
  catch (ex) {
    dump("*** cmdAddCharacter: " + ex + "\n");
  }
}

function onDoubleClick (event) {
  if (event.target.localName != "charactercard")
    return;
  top.openDocument(getRDFService().GetResource(event.target.id));
}
