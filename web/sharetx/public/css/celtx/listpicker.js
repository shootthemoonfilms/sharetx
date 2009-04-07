gWindow = {};

function loaded () {
  gWindow.config = window.arguments[0];

  var heading = document.getElementById("heading");
  heading.value = gWindow.config.header;

  var listbox = document.getElementById("listbox");

  for (var i = 0; i < gWindow.config.list.length; ++i) {
    var item = document.createElementNS(Cx.NS_XUL, "listitem");
    item.setAttribute("type", "checkbox");
    item.setAttribute("label", gWindow.config.list[i].label);
    item.setAttribute("value", gWindow.config.list[i].label);
    item.setAttribute("checked", "true");
    if (gWindow.config.list[i].disabled)
      item.setAttribute("disabled", "true");

    listbox.appendChild(item);
  }
}


function accepted () {
  gWindow.config.result = [];
  var children = document.getElementById("listbox").childNodes;
  for (var i = 0; i < children.length; ++i) {
    if (children[i].checked)
      gWindow.config.result.push(children[i].getAttribute("value"));
  }
  gWindow.config.accepted = true;
}


function canceled () {
  gWindow.config.accepted = false;
}
