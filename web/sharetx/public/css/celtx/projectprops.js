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

var gDialog;

function loaded () {
  gDialog = new Object;

  gDialog.titleLabel  = document.getElementById("title-label");
  gDialog.modLabel    = document.getElementById("modified-label");
  // gDialog.whereLabel  = document.getElementById("where-label");
  gDialog.titleBox    = document.getElementById("title-textbox");
  gDialog.taglineBox  = document.getElementById("tagline-textbox");
  gDialog.descBox     = document.getElementById("desc-textbox");
  gDialog.langMenu    = document.getElementById("lang-menulist");

  gDialog.sharedUsers = document.getElementById("shared-users");
  gDialog.publishMode = document.getElementById("mode-group");
  gDialog.defaultItem = document.getElementById("default-item");
  gDialog.userListBtn = document.getElementById("userlist-button");
  gDialog.descDeck    = document.getElementById("mode-desc-deck");

  gDialog.projImage   = document.getElementById("proj-image");
  gDialog.projEmbed   = document.getElementById("proj-embed");

  gDialog.config = window.arguments[0];
  
  gDialog.titleLabel.value  = gDialog.config.title;
  gDialog.modLabel.value    = gDialog.config.modified.toLocaleString();
  // gDialog.whereLabel.value  = gDialog.config.location.path;
  gDialog.titleBox.value    = gDialog.config.title;
  gDialog.taglineBox.value  = gDialog.config.tagline;
  gDialog.descBox.value     = gDialog.config.description;
  gDialog.projEmbed.value   = gDialog.config.embed;

  if (gDialog.config.image && gDialog.config.image != "") {
    setProjectImage(gDialog.config.image);
  }

  if (gDialog.config.users != "") {
    gDialog.sharedUsers.value = gDialog.config.users;
  }

  if (gDialog.config.mode != "") {
    var radio = document.getElementById("mode-" + gDialog.config.mode);
    if (radio) gDialog.publishMode.selectedItem = radio;
  }

  switch (gDialog.config.mode) {
    case 'public':
      optionPublic();
      break;
    case 'shared':
      optionShared();
      break;
    case 'private':
    default:
      optionPrivate();
      break;
  }

  loadAvailableLanguages();
}

function accepted () {
  var mode = gDialog.publishMode.selectedItem.id;
  mode = mode.replace(/^mode-/, '');
  gDialog.config.accepted     = true;
  gDialog.config.mode         = mode;
  gDialog.config.users        = gDialog.sharedUsers.value;
  gDialog.config.title        = gDialog.titleBox.value;
  gDialog.config.tagline      = gDialog.taglineBox.value;
  gDialog.config.description  = gDialog.descBox.value;
  gDialog.config.language     = gDialog.langMenu.selectedItem.id;
  gDialog.config.embed        = gDialog.projEmbed.value;
  if (gDialog.imgFile)
    gDialog.config.image      = gDialog.imgFile.leafName;
  else
    gDialog.config.image      = "";
  return true;
}

function canceled () {
  return true;
}

var gLanguagesList = [];

function loadAvailableLanguages () {
  // This is a parser for: resource://gre/res/language.properties
  // The file is formatted like so:
  // ab[-cd].accept=true|false
  //  ab = language
  //  cd = region
  var bundleAccepted    = document.getElementById("bundleAccepted");
  var bundleRegions     = document.getElementById("bundleRegions");
  var bundleLanguages   = document.getElementById("bundleLanguages");
  var bundlePreferences = document.getElementById("bundlePreferences");

  function LanguageInfo(aName, aABCD) {
    this.name = aName;
    this.abcd = aABCD;
  }

  // 1) Read the available languages out of language.properties
  var strings = bundleAccepted.strings;
  while (strings.hasMoreElements()) {
    var currString = strings.getNext();
    if (!(currString instanceof Components.interfaces.nsIPropertyElement))
      break;

    var property = currString.key.split("."); // ab[-cd].accept
    if (property[1] == "accept") {
      var abCD = property[0];
      var abCDPairs = abCD.split("-");      // ab[-cd]
      var useABCDFormat = abCDPairs.length > 1;
      var ab = useABCDFormat ? abCDPairs[0] : abCD;
      var cd = useABCDFormat ? abCDPairs[1] : "";
      if (ab) {
        var language = "";
        try {
          language = bundleLanguages.getString(ab);
        } 
        catch (e) { continue; };
        
        var region = "";
        if (useABCDFormat) {
          try {
            region = bundleRegions.getString(cd);
          }
          catch (e) { continue; }
        }

        var name = "";
        if (useABCDFormat)
          name = bundlePreferences.getFormattedString(
            "languageRegionCodeFormat", [language, region, abCD]);
        else
          name = bundlePreferences.getFormattedString("languageCodeFormat", 
                                                      [language, abCD]);

        if (name && abCD) {
          var li = new LanguageInfo(name, abCD);
          gLanguagesList.push(li);
        }
      }
    }
  }
  buildAvailableLanguageList();
}

function buildAvailableLanguageList () {
  var availableLanguagesPopup = gDialog.langMenu.firstChild;

  // Sort the list of languages by name
  gLanguagesList.sort(function (a, b) {
    return a.name.localeCompare(b.name);
  });

  var selItem = null;

  // Load the UI with the data
  for (var i = 0; i < gLanguagesList.length; ++i) {
    var abCD = gLanguagesList[i].abcd;
    var menuitem = document.createElement("menuitem");
    var abCDPairs = abCD.split("-");
    if (abCDPairs.length > 1)
      abCD = abCDPairs[0] + "-" + abCDPairs[1].toUpperCase();
    menuitem.id = abCD;
    availableLanguagesPopup.appendChild(menuitem);
    menuitem.setAttribute("label", gLanguagesList[i].name);
    if (menuitem.id == gDialog.config.language)
      selItem = menuitem;
  }

  if (selItem)
    gDialog.langMenu.selectedItem = selItem;
}

function revealProjectFolder () {
  try {
    var ILocalFile = Components.interfaces.nsILocalFile;
    var localfile = gDialog.config.location.QueryInterface(ILocalFile);
    localfile.reveal();
  }
  catch (ex) {
    dump("*** revealProjectFolder: " + ex + "\n");
  }
}


function setProjectImage (image) {
  var imgFile = gDialog.config.location.clone();
  imgFile.append(image);
  gDialog.projImage.setAttribute("src", fileToFileURL(imgFile));
  gDialog.imgFile = imgFile;
}


function pickProjectImage () {
  var fp = getFilePicker();
  fp.init(window, gApp.getText("AddMedia"), fp.modeOpen);
  if (isMac())
    fp.appendFilters(fp.filterAll);
  else
    fp.appendFilters(fp.filterImages | fp.filterAll);
  fp.displayDirectory = getMediaDir();
  if (fp.show() != fp.returnOK) return;

  var file = copyToUnique(fp.file, gDialog.config.location, fp.file.leafName);
  setProjectImage(file.leafName);
}


function clearProjectImage () {
  gDialog.projImage.setAttribute("src", "");
  gDialog.imgFile = null;
}


function optionShared () {
  gDialog.sharedUsers.disabled = false;
  gDialog.userListBtn.disabled = false;
  gDialog.descDeck.selectedIndex = 2;
}

function optionPublic () {
  gDialog.sharedUsers.disabled = true;
  gDialog.userListBtn.disabled = true;
  gDialog.descDeck.selectedIndex = 0;
}

function optionPrivate () {
  gDialog.sharedUsers.disabled = true;
  gDialog.userListBtn.disabled = true;
  gDialog.descDeck.selectedIndex = 1;
}

function presentUserlist () {
  var given;
  if (gDialog.sharedUsers.value)
    given = gDialog.sharedUsers.value.split(/, */);
  else
    given = [];
  var sessionData = {
    users: given,
    accepted: false
  };
  window.openDialog(Cx.CONTENT_PATH + "userlist.xul",
                    "userlist", Cx.MODAL_DIALOG_FLAGS,
                    sessionData);
  if (sessionData.accepted)
    gDialog.sharedUsers.value = sessionData.users.join(", ");
}
