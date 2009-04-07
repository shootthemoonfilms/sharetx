
///////////////////////////////////////////////////////////
// Project
///////////////////////////////////////////////////////////

var Project = {
    currentProject: null,

    currentRevision: null,

    requestPath: function(request) {
        if (Project.currentRevision) {
            return "/project/" + Project.currentProject + "/" + Project.currentRevision + "/" + request;
        } else {
            return "/project/" + Project.currentProject + "/" + request;
        }
    },

    open: function(id, revision, closeWindow) {
        Project.currentProject = id;
        Project.currentRevision = revision;

        Tabs.closeAll();

        if (closeWindow) {
            Windows.getFocusedWindow().close();
        }

        if (!Project.currentRevision) {
            new Ajax.Request(Project.requestPath("revision"), {
                onSuccess: function(transport) {
                    Project.currentRevision = transport.responseText.trim();
                    Project.refresh();
                }
            });
        } else {
            Project.refresh();
        }
    },

    openRevision: function(revision) {
        Project.open(Project.currentProject, revision);
    },

    refresh: function() {
        new Ajax.Updater("left_sidebar", Project.requestPath("filelist"));
        new Ajax.Updater("right_sidebar", Project.requestPath("info"));
        $$("#toolbar button").each(function(e) { e.disabled = false; });
    },

    openFile: function(file, name) {
        Tabs.open(file, name, Project.requestPath("file/" + file), true);
    }

};
