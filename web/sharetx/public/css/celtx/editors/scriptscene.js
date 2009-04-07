
function scenesContainingItem (ds, itemres) {
  var results = [];
  var seen = {};

  var rdfsvc = getRDFService();
  var cu = getRDFContainerUtils();
  var IRes = Components.interfaces.nsIRDFResource;
  var typearc = rdfsvc.GetResource(Cx.NS_RDF + "type");
  var depttype = rdfsvc.GetResource(Cx.NS_CX + "DepartmentList");
  var membersarc = rdfsvc.GetResource(Cx.NS_CX + "members");

  // Find the department lists the item is in
  var arcs = ds.ArcLabelsIn(itemres);
  while (arcs.hasMoreElements()) {
    var arc = arcs.getNext().QueryInterface(IRes);
    if (! cu.IsOrdinalProperty(arc))
      continue;
    var deptseqs = ds.GetSources(arc, itemres, true);
    while (deptseqs.hasMoreElements()) {
      var deptseq = deptseqs.getNext().QueryInterface(IRes);
      if (! ds.HasAssertion(deptseq, typearc, depttype, true))
        continue;

      // Find the sequence of department lists this list is in
      var deptarcs = ds.ArcLabelsIn(deptseq);
      while (deptarcs.hasMoreElements()) {
        var deptarc = deptarcs.getNext().QueryInterface(IRes);
        if (! cu.IsOrdinalProperty(deptarc))
          continue;

        // Department lists are anonymous nodes, so they should be
        // a member of only one sequence
        var mainseq = ds.GetSource(deptarc, deptseq, true);
        if (! mainseq)
          continue;

        // Likewise, the main sequence should belong to a unique scene
        var scene = ds.GetSource(membersarc, mainseq, true);
        if (scene && ! (scene.Value in seen)) {
          results.push(scene);
          seen[scene.Value] = 1;
        }
      }
    }
  }
  return results;
}


function Scene (ds, res) {
  this.ds = ds;
  this.res = res;

  var rdfsvc = getRDFService();

  var membersarc = rdfsvc.GetResource(Cx.NS_CX + "members");
  var members = ds.GetTarget(res, membersarc, true);
  if (! members) {
    members = rdfsvc.GetAnonymousResource();
    ds.Assert(res, membersarc, members, true);
  }
  this.members = new RDFSeq(ds, members);

  var markuparc = rdfsvc.GetResource(Cx.NS_CX + "markup");
  var markup = ds.GetTarget(res, markuparc, true);
  if (! markup) {
    markup = rdfsvc.GetAnonymousResource();
    ds.Assert(res, markuparc, markup, true);
  }
  this.markup = new RDFSeq(ds, markup);
}


Scene.prototype = {
  addItem: function addItem (itemres) {
    var rdfsvc = getRDFService();
    var typearc = rdfsvc.GetResource(Cx.NS_RDF + "type");
    var type = this.ds.GetTarget(itemres, typearc, true);
    if (! (type && type instanceof Components.interfaces.nsIRDFResource))
      throw "Scene.addItem: Cannot add item without a type";
    type = type.QueryInterface(Components.interfaces.nsIRDFResource);
    var deptseq = this._getDeptSequence(type, true);
    if (deptseq.indexOf(itemres) < 0)
      deptseq.push(itemres);
    var sizearc = rdfsvc.GetResource(Cx.NS_CX + "size");
    setRDFString(this.ds, deptseq.res, sizearc, deptseq.length);
  },


  removeItem: function removeItem (itemres) {
    var rdfsvc = getRDFService();
    var typearc = rdfsvc.GetResource(Cx.NS_RDF + "type");
    var type = this.ds.GetTarget(itemres, typearc, true);
    if (! (type && type instanceof Components.interfaces.nsIRDFResource))
      throw "Scene.removeItem: Cannot add item without a type";
    type = type.QueryInterface(Components.interfaces.nsIRDFResource);
    var deptseq = this._getDeptSequence(type);
    if (! deptseq)
      return;

    deptseq.remove(itemres);
    var sizearc = rdfsvc.GetResource(Cx.NS_CX + "size");

    if (deptseq.isEmpty()) {
      this.members.remove(deptseq.res);
      var deptarc = rdfsvc.GetResource(Cx.NS_CX + "department");
      var deptlisttype = rdfsvc.GetResource(Cx.NS_CX + "DepartmentList");
      this.ds.Unassert(deptseq.res, deptarc, type);
      this.ds.Unassert(deptseq.res, typearc, deptlisttype);
      clearRDFObject(this.ds, deptseq.res, sizearc);
    }
    else {
      setRDFString(this.ds, deptseq.res, sizearc, deptseq.length);
    }
  },


  containsItem: function containsItem (itemres) {
    var rdfsvc = getRDFService();
    var typearc = rdfsvc.GetResource(Cx.NS_RDF + "type");
    var type = this.ds.GetTarget(itemres, typearc, true);
    if (! (type && type instanceof Components.interfaces.nsIRDFResource))
      throw "Scene.containsItem: Cannot add item without a type: "
        + itemres.Value;
    type = type.QueryInterface(Components.interfaces.nsIRDFResource);
    var deptseq = this._getDeptSequence(type);
    return deptseq ? deptseq.indexOf(itemres) >= 0 : false;
  },


  addToMarkup: function addToMarkup (itemres) {
    if (this.markup.indexOf(itemres) < 0)
      this.markup.push(itemres);
  },


  removeFromMarkup: function removeFromMarkup (itemres) {
    this.markup.remove(itemres);
  },


  containsInMarkup: function containsInMarkup (itemres) {
    return this.markup.indexOf(itemres) >= 0;
  },


  _getDeptSequence: function (deptres, force) {
    var rdfsvc = getRDFService();
    var typearc = rdfsvc.GetResource(Cx.NS_RDF + "type");
    var deptlisttype = rdfsvc.GetResource(Cx.NS_CX + "DepartmentList");
    var deptarc = rdfsvc.GetResource(Cx.NS_CX + "department");
    var depts = this.members.toArray();
    for (var i = 0; i < depts.length; ++i) {
      var list = depts[i].QueryInterface(Components.interfaces.nsIRDFResource);
      var dept = this.ds.GetTarget(list, deptarc, true);
      if (dept && deptres.EqualsNode(dept))
        return new RDFSeq(this.ds, list);
    }
    if (! force)
      return null;
    var listres = rdfsvc.GetAnonymousResource();
    this.ds.Assert(listres, deptarc, deptres, true);
    this.ds.Assert(listres, typearc, deptlisttype, true);
    var list = new RDFSeq(this.ds, listres);
    this.members.push(listres);
    return list;
  }
};
