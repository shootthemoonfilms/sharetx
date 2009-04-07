var gWindow = new Object();

function loaded () {
  gWindow.args        = window.arguments[0];
  gWindow.caption     = document.getElementById("scenecaption");
  gWindow.intext      = document.getElementById("intext");
  gWindow.setting     = document.getElementById("setting");
  gWindow.daynight    = document.getElementById("daynight");
  gWindow.desc        = document.getElementById("description");
  gWindow.eighthsint  = document.getElementById("eighths_integral");
  gWindow.eighthsfrac = document.getElementById("eighths_fractional");
  gWindow.scriptday   = document.getElementById("scriptday");
  gWindow.scheduled   = document.getElementById("scheduled");
  gWindow.completed   = document.getElementById("completed");

  gWindow.caption.label   = gApp.getText("SceneNumber", [ gWindow.args.ord ]);
  gWindow.intext.value    = gWindow.args.intext;
  gWindow.setting.value   = gWindow.args.setting;
  gWindow.daynight.value  = gWindow.args.daynight;
  gWindow.desc.value      = gWindow.args.desc;
  if (gWindow.args.eighths) {
    var eighths = gWindow.args.eighths.match(/^(\d+) +(\d+) *\/ *8/);
    if (eighths) {
      gWindow.eighthsint.value = eighths[1];
      gWindow.eighthsfrac.value = eighths[2];
    }
    else
      dump("*** couldn't match eighths: " + gWindow.args.eighths + "\n");
  }
  if (gWindow.args.scriptday)
    gWindow.scriptday.value = gWindow.args.scriptday;

  var yesstr = gApp.getText("Yes");
  var nostr = gApp.getText("No");
  gWindow.scheduled.value = gWindow.args.scheduled ? yesstr : nostr;
  gWindow.completed.value = gWindow.args.completed ? yesstr : nostr;

  if (gWindow.args.intext == "?") {
    gWindow.intext.setAttribute("class", "errorlabel");
    gWindow.intext.setAttribute("popup", "intextpopup");
  }
  if (gWindow.args.daynight == "?") {
    gWindow.daynight.setAttribute("class", "errorlabel");
    gWindow.daynight.setAttribute("popup", "daynightpopup");
  }
}

function accepted () {
  gWindow.args.accepted = true;
  gWindow.args.desc = gWindow.desc.value;
  if (gWindow.eighthsint.value || gWindow.eighthsfrac.value) {
    try {
      var eighthsint = 0;
      var eighthsfrac = 0;
      if (gWindow.eighthsint.value)
        eighthsint = Number(gWindow.eighthsint.value);
      if (gWindow.eighthsfrac.value)
        eighthsfrac = Number(gWindow.eighthsfrac.value);
      if (isNaN(eighthsint) || isNaN(eighthsfrac))
        throw "Eighths is not a number";
      eighthsint = Math.floor(eighthsint);
      eighthsfrac = Math.floor(eighthsfrac);
      gWindow.args.eighths = eighthsint + " " + eighthsfrac + "/8";
    }
    catch (ex) {
      dump("*** accepted: " + ex + "\n");
      gWindow.args.accepted = false;
      return false;
    }
  }
  else
    gWindow.args.eighths = "";
  gWindow.args.scriptday = gWindow.scriptday.value;
  return true;
}

function canceled () {
  return true;
}
