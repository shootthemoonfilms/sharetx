
///////////////////////////////////////////////////////////
// Toolbar
///////////////////////////////////////////////////////////

var Toolbar = {
    init: function() {
        $$("#toolbar button").each(function(e) {
            if (["new", "open", "preferences"].indexOf(e.id) == -1) {
                e.setAttribute("disabled", "disabled");
            } else {
                e.disabled = false;
            }
        });
    
        Event.observe("new", "click", function() {
            Dialog.confirm(new Element("iframe", {
                style: "width: 100%; height: 75px; border: none",
                src: "/dialogs/new.html",
                id: "iframe_new"
            }), {
                className: "mac_os_x",
                title: "New project",
                width: 400,
                resizable: false,
                destroyOnClose: true,
                onLabel: "Create",
                onOk: function() {
                    Event.observe("iframe_new", "load", function(e) {
                        Windows.getFocusedWindow().close();
                    });

                    $("iframe_new").contentWindow.submit();
                    return false;
                }
            });
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
            Dialog.confirm({
                url: "/dialogs/upload.html",
                options: { method: "get" }
            }, {
                className: "mac_os_x",
                title: "Upload new version",
                width: 400,
                height: 80,
                destroyOnClose: true,
                okLabel: "Upload"
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
    }
};
