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

var bookmarks_controller = {
  open: function (project, docres) {
    var rdfsvc = getRDFService();
    var sourcearc = rdfsvc.GetResource(Cx.NS_DC + "source");
    var source = project.ds.GetTarget(docres, sourcearc, true);
    if (! source) {
      dump("*** No " + sourcearc.Value + " attribute on " + docres.Value + "\n");
      return;
    }
    source = source.QueryInterface(Components.interfaces.nsIRDFLiteral);
    var ios = getIOService();
    var eps = getExternalProtocolService();
    var uri = ios.newURI(source.Value, null, null);
    if (uri.scheme != "http" && uri.scheme != "https") {
      dump("*** Bookmarks are only supposed to be http[s] uris!\n");
      return;
    }
    if (! eps.externalProtocolHandlerExists(uri.scheme)) {
      dump("*** No external handler for " + uri.scheme + "\n");
      return;
    }
    eps.loadURI(uri, null);
  }
};
