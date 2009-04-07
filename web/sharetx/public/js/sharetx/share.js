include("sharetx.project");

///////////////////////////////////////////////////////////
// Share
///////////////////////////////////////////////////////////

var Share = {
    _openDialog: function(okLabel, onBeforeShow, onOk) {
        Dialog.confirm({
            url: "dialogs/share.html"
        }, {
            className: "mac_os_x",
            title: "Share",
            width: 400,
            height: 120,
            resizable: false,
            destroyOnClose: true,
            okLabel: okLabel,
            onBeforeShow: onBeforeShow,
            onOk: onOk
        });
    },

    addGroup: function() {
        Share._openDialog("Add new group", function() {
            $('share').focusFirstElement();
        }, function() {
            Windows.getFocusedWindow().close();
            Tabs.reload("share");
        });
    },

    addUser: function() {
        Share._openDialog("Add new user", function() {
            $('share').focusFirstElement();
        }, function() {
            Windows.getFocusedWindow().close();
            Tabs.reload("share");
        });
    },

    editGroup: function(name, type) {
        Share._openDialog("Save changes to group", function() {
            $('share').select("input[name=name]")[0].value = name;
            $('share').select("input[name=name]")[0].disabled = true;
            $('share').select("select[name=type] option[value=" + type + "]")[0].selected = true;
            $('share').focusFirstElement();
        }, function() {
            new Ajax.Request(Project.requestPath('share/group'), {
                onSuccess: function() {
                    Windows.getFocusedWindow().close();
                    Tabs.reload("share");
                },
                onFailure: function() {
                    alert("Error saving group");
                }
            });
        });
    },

    editUser: function(name, type) {
        Share._openDialog("Save changes to user", function() {
            $('share').select("input[name=name]")[0].value = name;
            $('share').select("input[name=name]")[0].disabled = true;
            $('share').select("select[name=type] option[value=" + type + "]")[0].selected = true;
            $('share').focusFirstElement();
        }, function() {
            Windows.getFocusedWindow().close();
            Tabs.reload("share");
        });
    },

    deleteGroup: function(name) {
        if (confirm("Are you sure you want to stop sharing this project with the group '" + name + "'?")) {
            Tabs.reload("share");
        }
    },

    deleteUser: function(name) {
        if (confirm("Are you sure you want to stop sharing this project with the user '" + name + "'?")) {
            Tabs.reload("share");
        }
    },
}
