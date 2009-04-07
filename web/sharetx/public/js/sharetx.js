
///////////////////////////////////////////////////////////
// OnLoad
///////////////////////////////////////////////////////////

Event.observe(window, "load", function() {
    Event.observe("left_sidebar_toggle", "click", function() { $("left_sidebar").toggle(); });
    Event.observe("right_sidebar_toggle", "click", function() { $("right_sidebar").toggle(); });

    include("sharetx.toolbar");
    include("sharetx.tabs");
    include("sharetx.project");
    include("sharetx.share");

    Toolbar.init();
});

if (!String.prototype.trim) {
    String.prototype.trim = function() {
        var ws = /\s/;
        var start = 0;
        var end = this.length;

        while (ws.test(this.charAt(start++)));
        while (ws.test(this.charAt(--end)));

        return this.slice(start - 1, end + 1);
    }
}
