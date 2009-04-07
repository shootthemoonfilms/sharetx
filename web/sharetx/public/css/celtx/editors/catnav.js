var gDelegate = null;

function loaded () {
}

function setView (mode) {
  if (mode == "tree") {
    document.getElementById("iconviewbtn").removeAttribute("checked");
    document.getElementById("listviewbtn").setAttribute("checked", "true");
    document.getElementById("viewdeck").selectedIndex = 0;
  }
  else if (mode == "icons") {
    document.getElementById("iconviewbtn").setAttribute("checked", "true");
    document.getElementById("listviewbtn").removeAttribute("checked");
    document.getElementById("viewdeck").selectedIndex = 1;
  }
}

function setDelegate (delegate) {
  gDelegate = delegate;
}
