include("sharetx.project");

///////////////////////////////////////////////////////////
// Toolbar
///////////////////////////////////////////////////////////

var Toolbar = {
    init: function() {
        $$("#toolbar button").each(function(e) {
            if (["open", "upload", "update", "preferences", "logout"].indexOf(e.id) == -1) {
                e.setAttribute("disabled", "disabled");
            } else {
                e.disabled = false;
            }
        });

        Event.observe("open", "click", function() {
            new Window({
                className: "mac_os_x",
                title: "Open project",
                width: 640,
                destroyOnClose: true
            }).setAjaxContent("/user/projects", { method: "get" }, true, true);
        });

        Event.observe("upload", "click", function() {
            new Window({
                className: "mac_os_x",
                title: "Upload new revision for project",
                width: 400,
                height: 130,
                destroyOnClose: true,
                resizable: false,
                maximizable: false,
                minimizable: false
            }).setAjaxContent("/project/upload", { method: "get" }, true, true);
        });

        Event.observe("update", "click", function() {
            new Window({
                className: "mac_os_x",
                title: "Update project",
                width: 400,
                height: 130,
                destroyOnClose: true,
                resizable: false,
                maximizable: false,
                minimizable: false
            }).setAjaxContent("/project/update", { method: "get" }, true, true);
        });

        Event.observe("download", "click", function() {
            $("download_iframe").src = Project.requestPath("download");
        });
    
    
        Event.observe("history", "click", function() {
            Tabs.open("history", "History", Project.requestPath("history"));
        });

        Event.observe("share", "click", function() {
            Tabs.open("share", "Share", Project.requestPath("share/overview"));
        });

        Event.observe("preferences", "click", function() {
            new Window({
                className: "mac_os_x",
                title: "Preferences",
                resizable: false,
                maximizable: false,
                minimizable: false,
                width: 640,
                destroyOnClose: true
            }).setAjaxContent("/dialogs/preferences.html", { method: "get" }, true, true);
        });

        Event.observe("logout", "click", function() {
            document.location.href = "/user/logout";
        });
    }
};
