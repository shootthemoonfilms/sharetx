/**
 * modularjs: A modular javascript system 
 *
 * How to use:
 *
 * 1. Add to head:
 *      <script type="text/javascript"
 *              src="include.js?somepackage.SomeModule1,somepackage.SomeModule2">
 *      </script>
 *
 * 2. And anywhere in your js files:
 *      include("somepackage.SomeOtherModule");
 *
 * Modules are loaded from [package]/[subpackage]/[ModuleName].js files.
 *
 * See the README file to learn how to compile your modules into a single
 * compressed file.
 */
var modularjs = {

    basePath: null,

    loaded: {},

    /**
     * Inits the modularjs system.
     */
    init: function () {
        /*globals ActiveXObject */

        if (typeof XMLHttpRequest != "undefined") {
            modularjs.xhr = new XMLHttpRequest();
        } else if (typeof ActiveXObject != "undefined") {
            modularjs.xhr = new ActiveXObject("Microsoft.XMLHTTP");
        } else {
            throw new Error("XMLHttpRequest not supported");
        }

        var head = document.getElementsByTagName("head")[0];
        var scripts = head.getElementsByTagName("script");

        for (var i = 0; i < scripts.length; i++) {
            var src = scripts[i].src;
            if (src.indexOf("include.js") > 0) {
                var parts = src.split("?");
                modularjs.basePath = parts[0].replace(/include\.js.*/, '');
                if (parts.length > 1) {
                    parts = parts[1].split(",");
                    for (var j = 0; j < parts.length; j++) {
                        modularjs.include(parts[j]);
                    }
                }
            }
        }
    },

    /**
     * Includes a module. Only absolute includes.
     * It's aliased to the global function 'include'.
     *
     * @param module {string} The module name
     */
    include: function (module) {
        if (modularjs.loaded[module]) return;

        var filename = modularjs.filename(module);

        modularjs.xhr.open("get", filename, false);
        modularjs.xhr.send(null);

        with (window) {
            var contents = modularjs.xhr.responseText + "\r\n//@ sourceURL=" + filename;
            window.eval(contents);
        }

        modularjs.loaded[module] = true;
    },

    /**
     * Returns the filename that corresponds to a module
     *
     * @param module {string} The module name
     * @returns The module filename
     */
    filename: function (module) {
        return modularjs.basePath + module.replace(/\./g, "/") + ".js";
    }
};

var include = modularjs.include;

modularjs.init();

