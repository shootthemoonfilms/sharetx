
///////////////////////////////////////////////////////////
// Toolbar
///////////////////////////////////////////////////////////

var Toolbar = {
    init: function() {
        $$("#toolbar button").each(function(e) {
            if (["new", "open", "preferences", "logout"].indexOf(e.id) == -1) {
                e.setAttribute("disabled", "disabled");
            } else {
                e.disabled = false;
            }
        });
    
        Event.observe("new", "click", function() {
            new Window({
                className: "mac_os_x",
                title: "Upload new project",
                width: 400,
                destroyOnClose: true,
                resizable: false,
                maximizable: false,
                minimizable: false
            }).setAjaxContent("/project/new", { method: "get" }, true, true);
        });

        Event.observe("open", "click", function() {
            new Window({
                className: "mac_os_x",
                title: "Open project",
                width: 640,
                destroyOnClose: true
            }).setAjaxContent("/user/projects", { method: "get" }, true, true);
        });

        Event.observe("download", "click", function() {
    
        });
    
        Event.observe("upload", "click", function() {
            Dialog.confirm(new Element("iframe", {
                style: "width: 100%; height: 175px; border: none",
                src: "/dialogs/upload.html",
                id: "iframe_new"
            }), {
                className: "mac_os_x",
                title: "Upload new version",
                width: 400,
                height: "auto",
                destroyOnClose: true,
                okLabel: "Upload",
                onShow: function(e) {
                    $(this.id + "_content").style.height = "auto";
                    $(this.id + "_content").style.overflow = "hidden";
                }
            });
        });
    
        Event.observe("update", "click", function() {
            Dialog.confirm({
                url: "/dialogs/update.html",
                options: { method: "get" }
            }, {
                className: "mac_os_x",
                title: "Update project",
                width: 400,
                height: 80,
                destroyOnClose: true,
                okLabel: "Update"
            });
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
