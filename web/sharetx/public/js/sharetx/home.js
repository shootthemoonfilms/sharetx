
///////////////////////////////////////////////////////////
// Home
///////////////////////////////////////////////////////////

var home_show = function(what, keep) {
    $$("#access ul li").each(function(e) { e.removeClassName("active"); });
    $(what + "_tab").addClassName("active");

    switch(what) {
    case "login":
        $$("#access_form *").each(Element.hide);
        $("username", "username_label", "password", "password_label", "remember", "remember_label", "login").each(Element.show);
        break;

    case "create":
        $$("#access_form li").each(function(e) { e.removeClassName("active"); });
        $$("#access_form *").each(Element.show);
        $("login", "reset", "remember", "remember_label").each(Element.hide);
        break;

    case "reset":
        $$("#access_form *").each(Element.hide);
        $("username", "username_label", "email", "email_label", "reset").each(Element.show);
        break;
    }

    if (!keep) {
        $$("#access p").each(function(e) { e.update(""); });
    }
}

Event.observe(window, "load", function() {
    Event.observe("login_tab", "click", home_show.curry("login", false));
    Event.observe("create_tab", "click", home_show.curry("create", false));
    Event.observe("reset_tab", "click", home_show.curry("reset", false));

    $("access_form").show();
    home_show(hash || "login", true);
});
