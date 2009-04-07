
///////////////////////////////////////////////////////////
// Tabs
///////////////////////////////////////////////////////////

var Tabs = {
    previousTab: null,
    currentTab: null,

    open: function(name, title, url, useIFrame) {
        if ($("tab_" + name)) {
            Tabs.show(name);
            return;
        }

        var tab = new Element("div", { "id": "tab_" + name }).update(title);
        var close = new Element("a", { href: "#", onclick: "return false;" }).update("x");

        Event.observe(tab, "click", function() { Tabs.show(name); });
        Event.observe(close, "click", function() { Tabs.close(name); });
        tab.appendChild(close);

        $("center_tabs").appendChild(tab);

        var tab_content = null;
        if (useIFrame) {
            tab_content = new Element("iframe", { "id": "tab_content_" + name, "src": url });
        } else {
            tab_content = new Element("div", { "id": "tab_content_" + name, "src": url });
            new Ajax.Updater({ success: tab_content }, url, {
                method: "GET",
                onFailure: function() {
                    alert("Error opening tab");
                    Tabs.close(name);
                }
            });
        }

        $("center_tabs_content").appendChild(tab_content);

        Tabs.show(name);
    },

    show: function(name) {
        if (!$("tab_" + name)) {
            console.warn("No tab with name: " + name);
            return false;
        }

        if (Tabs.currentTab && $("tab_" + Tabs.currentTab)) {
            $("tab_" + Tabs.currentTab).removeClassName('active');
            $("tab_content_" + Tabs.currentTab).hide();
            Tabs.previousTab = Tabs.currentTab;
        } else {
            Tabs.previousTab = name;
        }

        Tabs.currentTab = name;

        $("tab_" + Tabs.currentTab).addClassName('active');
        $("tab_content_" + Tabs.currentTab).show();

        return true;
    },

    reload: function(name) {
        var tab_content = $("tab_content_" + name);
        var url = tab_content.getAttribute("src");

        if (tab_content.tagName == "iframe") {
            tab_content.src = url;
        } else {
            new Ajax.Updater(tab_content, url);
        }
    },

    close: function(name) {
        $("tab_" + name).remove();
        $("tab_content_" + name).remove();
        if (name == Tabs.currentTab) {
            if (!Tabs.show(Tabs.previousTab) && $("center_tabs").firstElementChild) {
                Tabs.show($("center_tabs").firstElementChild.id.replace("tab_", ""));
            }
        }
    },

    closeAll: function(name) {
        $$("#center_tabs *").each(Element.remove);
        $$("#center_tabs_content *").each(Element.remove);
    }
};
