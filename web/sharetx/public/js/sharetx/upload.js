
///////////////////////////////////////////////////////////
// Upload
///////////////////////////////////////////////////////////

var Upload = {
    init: function() {
        $A(arguments).each(function(form) {
            form = $(form);
            form.gp_fileupload_id = Math.ceil(Math.random() * Math.pow(10, 20));
            form.request = Upload._request;
            form.action = form.action + "?gp.fileupload.id=" + form.gp_fileupload_id
        });
    },

    _request: function(parameters) {
        var id = "upload_" + Math.random();
        var iframe = new Element("iframe", {
            style: "display: none",
            id: id,
            name: id
        });
        document.body.appendChild(iframe);

        if (parameters.progress) {
            $(parameters.progress).insert({
                after: new Element("div", {
                    'class': "progress",
                    id: id + "_progress"
                }).update(new Element("div", {
                    'class': "bar",
                    id: id + "_bar"
                }))
            });
    
            $(parameters.progress).hide();
        }   

        this.originalTarget = this.target;
        this.target = id;

        var interval = null;
        if (parameters.onProgress || parameters.progress) {
            var progress = null;
            interval = setInterval((function() {
                new Ajax.Request("/gp.fileupload.stat/" + this.gp_fileupload_id, {
                    evalJSON: "force",
                    onComplete: function(transport) {
                        if (progress != transport.responseJSON) {
                            progress = transport.responseJSON;
                            if (parameters.onProgress) {
                                parameters.onProgress(progress);
                            }
                            if (parameters.progress) {
                                if (progress.state == 1) {
                                    $(id + "_progress").addClassName("active");
                                }
                                $(id + "_bar").style.width = progress.percent + "%";
                            }
                        }

                        if (progress.percent == 100) {
                            $(id + "_progress").removeClassName("active");
                            clearInterval(interval);
                        }
                    }
                });
            }).bind(this), 500);
        }

        Event.observe(id, "load", function(e) {
            if (parameters.onComplete) {
                parameters.onComplete({
                    responseText: iframe.contentWindow.document.body.innerHTML
                });
            }
            clearTimeout(interval);
            iframe.remove();
        });

        this.submit();
    }
}
