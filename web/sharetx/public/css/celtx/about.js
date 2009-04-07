var gDialog = new Object;

function loaded () {
  var versionlabel  = document.getElementById("versionlabel");
  var strings       = document.getElementById("celtx-strings");
  gDialog.creditbox = document.getElementById("creditbox");

  var appinfo = Components.classes["@mozilla.org/xre/app-info;1"]
    .getService(Components.interfaces.nsIXULAppInfo);
  versionlabel.value = strings.getString("CeltxVersion") + " " + Cx.VERSION
    + " (" + appinfo.appBuildID + ")";
  window.setInterval(rollCredits, 50);
}

function rollCredits () {
  var cw = gDialog.creditbox.contentWindow;
  if (cw.scrollY < cw.scrollMaxY)
    cw.scrollBy(0, 1);
  else
    cw.scrollTo(0, 0);
}
