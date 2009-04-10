
///////////////////////////////////////////////////////////
// Upload
///////////////////////////////////////////////////////////

var Upload = {
    init: function() {
        $A(arguments).each(function(form) {
            $(form).request = Upload._request;
        });
    },

    _request: function(parameters) {
        var id = "upload_iframe_" + Math.random();
        var iframe = new Element("iframe", {
            style: "display: none",
            id: id,
            name: id
        });
        document.body.appendChild(iframe);

        this.originalTarget = this.target;
        this.target = id;

        var interval = null;
        if (parameters.onProgress) {
            var progress = null;
            interval = setInterval(function() {
                new Ajax.Request("/gp.fileupload.stat/1", {
                    evalJSON: "force",
                    onComplete: function(transport) {
                        if (progress != transport.responseJSON) {
                            progress = transport.responseJSON;
                            parameters.onProgress(progress);
                        }
                    }
                });
            }, 100);
        }

        Event.observe(id, "load", function(e) {
            if (parameters.onComplete) {
                parameters.onComplete({
                    transport: iframe,
                    responseText: iframe.contentWindow.document.body.innerHTML
                });
            }
            clearTimeout(interval);
            iframe.remove();
        });

        this.submit();
    }
}
