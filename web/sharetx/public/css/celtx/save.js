/*
 * This file consolidates all the code related to saving a Celtx project.
 *
 * Part of the reason was that the save code was becoming complicated,
 * turning into a Gordian knot. In addition, the addition of Studio features
 * means that a lot of these calls are no longer guaranteed to be blocking,
 * which gave good reason to cut the knot by rewriting it from scratch.
 */


/**
 * This flag controls whether we use the new system of saving to a temp file,
 * then overwriting the old save file with the temp file, or whether we use
 * the old system of creating a backup file and then saving directly to the
 * save file. If this flag is true, the new system is used.
 *
 * If the old system is used, the save can't be interrupted (it leaves behind
 * a truncated save file), so the cancel button next to the progress bar is
 * hidden and attempting to quit fails with a warning message.
 */
var gSaveToTempFile = false;


/**
 * Note: Determining the Default Save Location.
 *
 * The default save location of a project is determined when it is opened,
 * and set as a property on the Project object. This property is transient;
 * it is not stored in the RDF. If the user saves the project to a different
 * location, the property is updated to reflect it.
 *
 * Project.saveLocation takes on one of the following values:
 *   null (no default save location)
 *   Project.SAVE_TO_DISK
 *   Project.SAVE_TO_SERVER
 *
 * The specific location is determined differently, according to whether it
 * is saved to disk or to the server. If it is saved to disk, the location
 * is determined by the getProjectFile function. If it is saved to the
 * server, it is determined by the wsref property.
 */


/*
 * Section 1: User Actions
 *
 * These handle user actions and provide them with feedback. They should
 * provide only the logic necessary to determine the user's intention and
 * advise them of success or failure. They should not return any value and
 * they must not take any parameters.
 *
 * A user action function should never be called except as the first call in
 * response to user input or as a delegate of another user action function.
 */


/**
 * Handler for the generic "Save Project" option. Saves the project back to
 * its original location if one exists, otherwise it prompts the user for
 * a location.
 */
function cmdSaveProject () {
  if (isSavePending())
    return;

  if (gProject.saveLocation == Project.SAVE_TO_DISK) {
    var file = getProjectFile();
    if (file) {
      doSaveProjectToFile(file);
    }
    else {
      var ps = getPromptService();
      ps.alert(window, gApp.getText("SaveFileNotFoundTitle"),
        gApp.getText("SaveFileNotFoundMsg"));
      cmdSaveProjectAsFile();
    }
  }
  else if (gProject.saveLocation == Project.SAVE_TO_SERVER) {
    var cxsvc = getCeltxService();
    if (! cxsvc.loggedIn) {
      var observer = {
        onLogin: function (good) { if (good) cmdSaveProject(); }
      };
      cxsvc.login("", observer, false, window);
      return;
    }
    doSaveProjectToServer(gProject.wsref);
  }
  else {
    // For now, we assume they want to save to disk.
    cmdSaveProjectAsFile();
  }
}


/**
 * Handler for the "Save Project as File" option.
 */
function cmdSaveProjectAsFile () {
  if (isSavePending())
    return;

  var location = promptForFileSaveLocation(getCeltxProjectsDir(), false);
  if (location) {
    setCeltxProjectsDir(location.parent);
    gProject.title = location.leafName.replace(/\.celtx$/, "");
    setWindowTitle(location.leafName);
    doSaveProjectToFile(location);
  }
}


/**
 * Handler for the "Save Project to Studio" option.
 */
function cmdSaveProjectToServer () {
  if (isSavePending())
    return;

  var cxsvc = getCeltxService();
  if (! cxsvc.loggedIn) {
    var observer = {
      onLogin: function (good) { if (good) cmdSaveProjectToServer(); }
    };
    cxsvc.login("", observer, false, window);
    return;
  }

  var config = {
    accepted: false,
    wsref: gProject.wsref,
    title: gProject.title
  };

  openDialog(Cx.CONTENT_PATH + "savestudiodialog.xul", "",
    Cx.MODAL_DIALOG_FLAGS, config);

  if (config.accepted) {
    gProject.title = config.title;
    setWindowTitle(gProject.title);
    doSaveProjectToServer(config.wsref);
  }
}


/**
 * Handler for the "Save Project as Template" option.
 */
function cmdSaveProjectAsTemplate () {
  if (isSavePending())
    return;

  var location = promptForFileSaveLocation(null, true);
  if (location) {
    doSaveProjectToTemplate(location);
  }
}


/*
 * Section 2: User Action Utilities
 *
 * These group common behaviour for user actions. They are allowed to interact
 * with the user, so it should not be assumed that they will run silently.
 * This is also the place for actions that are not in response to user input,
 * but may nevertheless require user interaction, such as  an auto-save
 * feature that needs to alert the user if it fails.
 *
 * Ideally, these should focus on translating user choices into the right
 * function calls and handling errors when they are returned.
 */


/**
 * Prompts the user with a file save dialog.
 * @param dir{nsIFile}  a directory to start in
 * @param template{boolean}  prompt to save as a template file if true
 */
function promptForFileSaveLocation (dir, template) {
  var defaultext = template ? "tceltx" : "celtx";
  var typename = gApp.getText(template ? "CeltxTemplate" : "CeltxProject");

  var fp = getFilePicker();
  var IFilePicker = Components.interfaces.nsIFilePicker;
  fp.init(window, gApp.getText("SaveProject"), IFilePicker.modeSave);
  fp.appendFilter(typename, "*." + defaultext);
  fp.defaultExtension = defaultext;
  fp.defaultString = gProject.title + "." + defaultext;
  if (dir)
    fp.displayDirectory = dir;

  if (fp.show() == IFilePicker.returnCancel)
    return null;

  var extre = new RegExp("\." + defaultext + "$");
  if (! extre.test(fp.file.leafName))
    fp.file.leafName += "." + defaultext;

  return fp.file;
}


/**
 * Callback for auto-save.
 */
function autosave () {
  if (gProject.saveLocation == Project.SAVE_TO_DISK) {
    var file = getProjectFile();
    if (! file)
      return;

    if (isReadableFile(file) && file.isWritable()) {
      doSaveProjectToFile(file);
    }
    else {
      var ps = getPromptService();
      ps.alert(window, gApp.getText("AutosaveFailedTitle"),
        gApp.getText("AutosaveFailedMsg"));
    }
  }
  else if (gProject.saveLocation == Project.SAVE_TO_SERVER) {
    doSaveProjectToServer(gProject.wsref);
  }
}


/**
 * Pretty self-explanatory, don't you think?
 */
function doSaveProject (callback) {
  if (gProject.saveLocation == Project.SAVE_TO_DISK) {
    var file = getProjectFile();
    if (isReadableFile(file) && file.isWritable()) {
      doSaveProjectToFile(file, callback);
    }
    else if (isReadableFile(file)) {
      var ps = getPromptService();
      ps.alert(window, gApp.getText("SaveFileNotWritableTitle"),
        gApp.getText("SaveFileNotWritableMsg"));

      var location = promptForFileSaveLocation(getCeltxProjectsDir(), false);
      if (location) {
        setCeltxProjectsDir(location.parent);
        doSaveProjectToFile(location, callback);
      }
    }
    else {
      var ps = getPromptService();
      ps.alert(window, gApp.getText("SaveFileNotFoundTitle"),
        gApp.getText("SaveFileNotFoundMsg"));

      var location = promptForFileSaveLocation(getCeltxProjectsDir(), false);
      if (location) {
        setCeltxProjectsDir(location.parent);
        doSaveProjectToFile(location, callback);
      }
    }
  }
  else if (gProject.saveLocation == Project.SAVE_TO_SERVER) {
    doSaveProjectToServer(gProject.wsref, callback);
  }
  else {
    // For now, we assume they want to save to disk.
    var location = promptForFileSaveLocation(getCeltxProjectsDir(), false);
    if (location) {
      setCeltxProjectsDir(location.parent);
      doSaveProjectToFile(location, callback);
    }
  }
}


/**
 * Saves the project to a file on disk. This handles any user interaction
 * or updating of the interface status.
 * @param file{nsIFile}  the destination for the project
 * @param callback  a callback for interested listeners (optional)
 */
function doSaveProjectToFile (file, callback) {
  var statusbox = document.getElementById("statusbox");
  var statusmsg = document.getElementById("statusmsg");
  var statusbar = document.getElementById("statusprogress");
  var cancelbtn = document.getElementById("statuscancelbutton");

  var innercb = {
    succeeded: function () {
      statusmsg.value = gApp.getText("Saved") + ".";
      statusbar.value = 100;
      cancelbtn.collapsed = true;

      setTimeout(function () {
        statusbar.collapsed = true;
        statusmsg.value = gApp.getText("LastLocalSavePrompt") + " "
          + new Date();
      }, 1000);

      goUpdateCommand("cmd-reveal-project");

      if (callback)
        callback.succeeded();
    },
    cancelled: function () {
      statusmsg.value = gApp.getText("Cancelled") + ".";
      statusbar.mode = "determined";
      statusbar.value = 0;
      cancelbtn.collapsed = true;

      setTimeout(function () {
        statusbar.collapsed = true;
        statusmsg.value = "";
      }, 1000);

      goUpdateCommand("cmd-reveal-project");

      if (callback)
        callback.cancelled();
    },
    failed: function (error) {
      statusmsg.value = gApp.getText("SaveFailedTitle");
      statusbar.value = 0;
      cancelbtn.collapsed = true;
      statusbar.collapsed = true;

      var ps = getPromptService();
      ps.alert(window, gApp.getText("SaveFailedTitle"),
        gApp.getText("SaveFailedPrompt") + " " + error.toString());

      goUpdateCommand("cmd-reveal-project");

      if (callback)
        callback.failed(error);
    },
    progress: function (current, total) {
      if (total == 0)
        statusbar.value = 100;
      else
        statusbar.value = Math.floor(100 * current / total);

      if (callback)
        callback.progress(current, total);
    }
  };

  statusmsg.value = gApp.getText("SavingProjectProgressMsg");
  statusbar.mode = "determined";
  statusbar.value = 0;
  statusbar.collapsed = false;
  cancelbtn.collapsed = ! gSaveToTempFile;
  statusbox.collapsed = false;

  saveProjectToFile(file, innercb);
}


/**
 * Saves the project to a template on disk. This handles any user interaction
 * or updating of the interface status.
 * @param file{nsIFile}  the destination for the project
 * @param callback  a callback for interested listeners (optional)
 */
function doSaveProjectToTemplate (file, callback) {
  var statusbox = document.getElementById("statusbox");
  var statusmsg = document.getElementById("statusmsg");
  var statusbar = document.getElementById("statusprogress");
  var cancelbtn = document.getElementById("statuscancelbutton");

  var wasmodified = isProjectModified();
  var oldtitle = gProject.title;

  gProject.isTemplate = true;

  var innercb = {
    succeeded: function () {
      gProject.isTemplate = false;
      gProject.title = oldtitle;
      gProject.isModified = wasmodified;

      statusmsg.value = gApp.getText("Saved") + ".";
      statusbar.value = 100;
      cancelbtn.collapsed = true;

      try {
        addToTemplates(file);
      }
      catch (ex) { dump("*** " + ex + "\n"); }

      setTimeout(function () {
        statusbar.collapsed = true;
        statusmsg.value = "";
      }, 1000);

      if (callback)
        callback.succeeded();
    },
    cancelled: function () {
      gProject.isTemplate = false;
      gProject.title = oldtitle;
      gProject.isModified = wasmodified;

      statusmsg.value = gApp.getText("Cancelled") + ".";
      statusbar.mode = "determined";
      statusbar.value = 0;
      cancelbtn.collapsed = true;

      setTimeout(function () {
        statusbar.collapsed = true;
        statusmsg.value = "";
      }, 1000);

      if (callback)
        callback.cancelled();
    },
    failed: function (error) {
      gProject.isTemplate = false;
      gProject.title = oldtitle;
      gProject.isModified = wasmodified;

      statusmsg.value = "";
      statusbar.value = 0;
      cancelbtn.collapsed = true;
      statusbar.collapsed = true;

      var ps = getPromptService();
      ps.alert(window, gApp.getText("SaveFailedTitle"),
        gApp.getText("SaveTemplateFailedPrompt") + " " + error.toString());

      if (callback)
        callback.failed(error);

    },
    progress: function (current, total) {
      if (total == 0)
        statusbar.value = 100;
      else
        statusbar.value = Math.floor(100 * current / total);

      if (callback)
        callback.progress(current, total);
    }
  };

  statusbar.mode = "determined";
  statusbar.value = 0;
  statusbar.collapsed = false;
  statusmsg.value = gApp.getText("SavingTemplateProgressMsg");
  cancelbtn.collapsed = ! gSaveToTempFile;
  statusbox.collapsed = false;

  gProject.title = file.leafName.replace(/\.t?celtx$/, "");
  saveProjectToFile(file, innercb);
}


function doSaveProjectToServer (wsref, callback) {
  var statusbox = document.getElementById("statusbox");
  var statusmsg = document.getElementById("statusmsg");
  var statusbar = document.getElementById("statusprogress");
  var cancelbtn = document.getElementById("statuscancelbutton");

  var innercb = {
    succeeded: function () {
      statusmsg.value = gApp.getText("Saved") + ".";
      statusbar.value = 100;
      cancelbtn.collapsed = true;


      setTimeout(function () {
        statusbar.collapsed = true;
        statusmsg.value = gApp.getText("LastStudioSavePrompt") + " "
          + new Date();
      }, 1000);

      goUpdateCommand("cmd-reveal-project");

      if (callback)
        callback.succeeded();
    },
    cancelled: function () {
      statusmsg.value = gApp.getText("Cancelled") + ".";
      statusbar.mode = "determined";
      statusbar.value = 0;
      cancelbtn.collapsed = true;

      setTimeout(function () {
        statusbar.collapsed = true;
        statusmsg.value = "";
      }, 1000);

      goUpdateCommand("cmd-reveal-project");

      if (callback)
        callback.cancelled();
    },
    failed: function (error) {
      statusmsg.value = "";
      statusbar.value = 0;
      cancelbtn.collapsed = true;
      statusbar.collapsed = true;

      var ps = getPromptService();
      ps.alert(window, gApp.getText("SaveFailedTitle"),
        gApp.getText("SaveStudioFailedPrompt") + " " + error.toString());

      goUpdateCommand("cmd-reveal-project");

      if (callback)
        callback.failed(error);
    },
    progress: function (current, total) {
      if (statusbar.mode != "determined")
        statusbar.mode = "determined";

      if (total == 0)
        statusbar.value = 100;
      else
        statusbar.value = Math.floor(100 * current / total);

      if (callback)
        callback.progress(current, total);
    }
  };


  // This captures the sequence of steps, even though they are each
  // triggered as a callback.
  function doSaveProjectToServer_step (step) {
    if (step == "start") {
      statusbar.value = 0;
      statusbar.mode = "undetermined";
      statusbar.collapsed = false;
      statusmsg.value = gApp.getText("SavingStudioProgressMsg");
      cancelbtn.collapsed = false;
      statusbox.collapsed = false;

      setTimeout(doSaveProjectToServer_step, 0, "checkVersion");
    }
    else if (step == "checkVersion") {
      if (! wsref) {
        setTimeout(doSaveProjectToServer_step, 0, "getCommitMessage");
        return;
      }

      var xhr = new XMLHttpRequest();
      var projuri = getCeltxService().workspaceURI + "/project/" + wsref;
      xhr.open("GET", projuri, true);
      xhr.onerror = function () {
        gPendingSaveRequest = null;
        innercb.failed(xhr.status + " " + xhr.statusText);
      };
      xhr.onreadystatechange = function () {
        // There is no "aborted" signal for XMLHttpRequest, but you can tell
        // if it was cancelled because it transitions to readyState=4, then
        // silently transitions to readyState=0.
        if (xhr.readyState == 1) {
          gPendingSaveRequest = xhr;
        }
        else if (xhr.readyState == 4) {
          gPendingSaveRequest = null;
          setTimeout(function () {
            if (xhr.readyState == 0) innercb.cancelled();
          }, 0);
        }
      };
      xhr.onload = function () {
        if (xhr.status < 200 || xhr.status >= 300) {
          innercb.failed(xhr.statusText);
          return;
        }

        try {
          var projdata = JSON.parse(xhr.responseText);
          if (wsref != projdata.latest) {
            // Disabled for 1.1 release
            /*
            var ps = getPromptService();
            var confirmed = ps.confirm(window,
              gApp.getText("OverwriteWithOlderTitle"),
              gApp.getText("OverwriteWithOlderMsg"));
            if (! confirmed) {
              innercb.cancelled();
              return;
            }
             */
            wsref = projdata.latest;
          }
          doSaveProjectToServer_step("getCommitMessage");
        }
        catch (ex) {
          innercb.failed(ex);
        }
      };
      xhr.setRequestHeader("Accept", "application/json");
      xhr.send(null);
    }
    else if (step == "getCommitMessage") {
      var rdfsvc = getRDFService();
      var msgarc = rdfsvc.GetResource(Cx.NS_CX + "commitMessage");

      var pref = getPrefService().getBranch("celtx.server.");
      if (! pref.getBoolPref("promptForCommitMessage")) {
        setTimeout(doSaveProjectToServer_step, 0, "sendModel");
        return;
      }

      var msg = { value: "" };
      var shouldprompt = { value: true };
      var ps = getPromptService();

      var confirmed = ps.prompt(window, gApp.getText("SaveCommentTitle"),
        gApp.getText("SaveCommentPrompt"), msg,
        gApp.getText("SaveCommentCheckbox"), shouldprompt);
      if (! confirmed) {
        innercb.cancelled();
        return;
      }

      if (! shouldprompt.value)
        pref.setBoolPref("promptForCommitMessage", false);

      setTimeout(doSaveProjectToServer_step, 0, "sendModel", msg.value);
    }
    else if (step == "sendModel") {
      var commitmsg = arguments.length > 1 ? arguments[1] : "";
      saveProjectToServer(wsref, commitmsg, innercb);
    }
  }

  doSaveProjectToServer_step("start");
}


/**
 * Section 3: Non-User Utilties
 *
 * These functions never interact with the user.
 */


/**
 * Stores the currently pending request, so that it can be cancelled.
 * @private
 */
var gPendingSaveRequest = null;


/**
 * Returns true if there is an active save request.
 */
function isSavePending () {
  return gPendingSaveRequest != null;
}


/**
 * Cancels any pending save request.
 */
function cancelPendingSaveRequest () {
  if (! gPendingSaveRequest) return;
  try {
    var IPersist = Components.interfaces.nsIWebBrowserPersist;
    if (gPendingSaveRequest instanceof IPersist)
      gPendingSaveRequest.cancelSave();
    else
      gPendingSaveRequest.abort();

    gPendingSaveRequest = null;
  }
  catch (ex) {}
}


/**
 * Saves the project to a file on disk. This handles housekeeping around
 * the save process, such as clearing modified flags and recording the
 * new save location.
 */
function saveProjectToFile (file, callback) {
  try {
    saveOpenTabs();
  }
  catch (ex) {
    // The open tab list is hardly a critical issue. Ignore any errors.
    dump("*** saveOpenTabs: " + ex + "\n");
  }

  try {
    var innercb = {
      succeeded: function () {
        if (! gProject.isTemplate) {
          gProject.isModified = false;
          gProject.saveLocation = Project.SAVE_TO_DISK;
          window.setProjectFile(file);
          addToRecentProjects(file.persistentDescriptor);
        }

        if (callback)
          callback.succeeded();
      },
      cancelled: function () {
        gProject.isModified = true;

        if (callback)
          callback.cancelled();
      },
      failed: function (error) {
        gProject.isModified = true;
        // Should we really reset the save location? It will force a
        // Save As dialog, which is probably what we want.
        gProject.saveLocation = null;

        if (callback)
          callback.failed(error);
      },
      progress: function (current, total) {
        if (callback)
          callback.progress(current, total);
      }
    };
    writeProjectFiles();
    archiveCeltxProject(file, innercb);
  }
  catch (ex) {
    if (callback)
      callback.failed(ex);
  }
}


/**
 * Saves the project to the server. Similar to saveProjectToFile, but with
 * more complexity and even more modes of failure.
 * @param wsref{string}  the uri to save the project to, or null to create
 *                       a new one (optional)
 * @param callback  a callback for interested listeners (optional)
 */
function saveProjectToServer (wsref, commitmsg, callback) {
  var cxsvc = getCeltxService();
  var method = wsref ? "PUT" : "POST";
  var uploaduri = cxsvc.workspaceURI;
  if (wsref)
    uploaduri += "/project/" + wsref;
  else
    uploaduri += "/projects";

  var innercb = {
    succeeded: function () {
      gProject.isModified = false;
      gProject.saveLocation = Project.SAVE_TO_SERVER;

      if (callback)
        callback.succeeded();
    },
    cancelled: function () {
      gProject.isModified = true;

      if (callback)
        callback.cancelled();
    },
    failed: function (error) {
      gProject.isModified = true;

      if (callback)
        callback.failed(error);
    },
    progress: function (current, total) {
      if (callback)
        callback.progress(current, total);
    }
  };

  var tmpds = null;
  var uploads = [];
  var uploadindex = 0;

  var totalKb = 0;
  var completedKb = 0;
  var pendingKb = 0; // "Size of file being uploaded", essentially

  var transRes = null;
  var finishURL = null;
  var new_wsref = null;

  function saveProjectToServer_step (step) {
    if (step == "start") {
      // Flush the project files
      try {
        writeProjectFiles();

        var rdfsvc = getRDFService();
        var commitarc = rdfsvc.GetResource(Cx.NS_CX + "commitMessage");
        tmpds = prepareUploadModel();
        setRDFString(tmpds, gProject.res, commitarc, commitmsg);

        setTimeout(saveProjectToServer_step, 0, "sendModel");
      }
      catch (ex) {
        innercb.failed(ex);
        return;
      }
    }
    else if (step == "sendModel") {
      try {
        // Flush the temporary sync DS
        var remotetmpds = tmpds.QueryInterface(
          Components.interfaces.nsIRDFRemoteDataSource);
        remotetmpds.Flush();

        // We can't use nsIDOMDocument.load here because it throws a security
        // exception trying to parse a file:// URL as of Firefox 3.
        var dsFile = fileURLToFile(tmpds.URI);
        var parser = new DOMParser();
        var bis = getBufferedFileInputStream(dsFile);
        var dom = parser.parseFromStream(bis, "UTF-8", dsFile.fileSize,
          "application/xml");
        bis.close();

        var xhr = new XMLHttpRequest();
        xhr.open(method, uploaduri, true);
        xhr.onerror = function () {
          gPendingSaveRequest = null;

          innercb.failed(xhr.statusText);
        };
        xhr.onreadystatechange = function () {
          // There is no "aborted" signal for XMLHttpRequest, but you can tell
          // if it was cancelled because it transitions to readyState=4, then
          // silently transitions to readyState=0.
          if (xhr.readyState == 1) {
            gPendingSaveRequest = xhr;
          }
          else if (xhr.readyState == 4) {
            gPendingSaveRequest = null;
            setTimeout(function () {
              if (xhr.readyState == 0) innercb.cancelled();
            }, 0);
          }
        };
        xhr.onload = function () {
          gPendingSaveRequest = null;

          if (xhr.status != 200) {
            innercb.failed(xhr.statusText);
            return;
          }
          setTimeout(saveProjectToServer_step, 0, "prepareUploads",
            xhr.responseText);
        };
        xhr.setRequestHeader("Content-Type", "application/rdf+xml");
        xhr.setRequestHeader("Accept", "application/rdf+xml");
        xhr.send(dom);
      }
      catch (ex) {
        innercb.failed(ex);
      }
    }
    else if (step == "prepareUploads") {
      if (arguments.length < 2) {
        innercb.failed(new Error("Did not receive a response model"));
        return;
      }
      try {
        var m = stringToModel(arguments[1]);
        var projres = RES(gProject.res.Value);

        transRes = m.source(PROP('cx:project'), projres);
        if (! transRes) throw "Missing transaction URI";

        var finishRes = m.target(transRes, PROP('cx:finish'));
        if (! finishRes) throw "Missing transaction finish URI";
        finishURL = finishRes.value;

        // Find all our uploads
        var uploadList = m.targets(transRes, PROP('cx:action'));

        var leaf, dest, rec;
        for (var i = 0; i < uploadList.length; i++) {
          leaf = m.target(uploadList[i], PROP('cx:localFile'));
          dest = m.target(uploadList[i], PROP('cx:destination'));
          rec = { leaf: leaf.value, dest: dest.value };
          uploads.push(rec);
          var file = gProject.projectFolder;
          file.append(rec.leaf);
          if (isReadableFile(file))
            totalKb += file.fileSize;
        }

        innercb.progress(0, totalKb);

        setTimeout(saveProjectToServer_step, 0, "uploadNextFile");
      }
      catch (ex) {
        innercb.failed(ex);
      }
    }
    else if (step == "uploadNextFile") {
      try {
        completedKb += pendingKb;
        innercb.progress(completedKb, totalKb);

        if (uploadindex == uploads.length) {
          setTimeout(saveProjectToServer_step, 0, "finishUploads");
          return;
        }

        var rec = uploads[uploadindex++];
        var file = gProject.projectFolder;
        file.append(rec.leaf);
        if (! isReadableFile(file)) {
          dump("*** Missing file: " + rec.leaf);
          setTimeout(saveProjectToServer_step, 0, "uploadNextFile");
          return;
        }

        var ios  = getIOService();
        var uri  = ios.newURI(rec.dest, null, null);
        pendingKb += file.fileSize;

        // XXX really necessary?
        uri = uri.QueryInterface(Components.interfaces.nsIURL);

        var src  = ios.newFileURI(file);
        src = src.QueryInterface(Components.interfaces.nsIURL);    

        var IWebProgress = Components.interfaces.nsIWebProgressListener;
        var uploadListener = {
          QueryInterface: function (iid) {
            if (iid.equals(IWebProgress) ||
                iid.equals(Components.interfaces.nsISupportsWeakReference))
              return this;
            throw Components.results.NS_ERROR_NO_INTERFACE;
          },
          onStateChange: function (prog, req, flags, status) {
            var stopmask = IWebProgress.STATE_STOP |
                           IWebProgress.STATE_IS_NETWORK;
            if (status & 0x80000000) {
              gPendingRequest = null;
              var NS_BINDING_ABORTED = 0x804B0002;
              if (status == NS_BINDING_ABORTED)
                innercb.cancelled();
              else
                innercb.failed(status);
            }
            else if ((flags & stopmask) == stopmask) {
              gPendingRequest = null;
              setTimeout(saveProjectToServer_step, 0, "uploadNextFile");
            }
          },
          onProgressChange: function (prog, req, curself, maxself, curtotal,
                                      maxtotal) {
            innercb.progress(completedKb + curself, totalKb);
          },
          onLocationChange: function (prog, req, loc) {},
          onStatusChange: function (prog, req, status, msg) {},
          onSecurityChange: function (prog, req, status) {}
        };

        var persist = getWebBrowserPersist();
        persist.persistFlags |= persist.PERSIST_FLAGS_BYPASS_CACHE;
        persist.progressListener = uploadListener;
        gPendingSaveRequest = persist;
        persist.saveURI(src, null, null, null, null, uri);
      }
      catch (ex) {
        innercb.failed(ex);
      }
    }
    else if (step == "finishUploads") {
      try {
        var xhr = new XMLHttpRequest();
        xhr.open("POST", finishURL, true);
        xhr.onerror = function () {
          gPendingSaveRequest = null;

          innercb.failed(xhr.statusText);
        };
        xhr.onreadystatechange = function () {
          // There is no "aborted" signal for XMLHttpRequest, but you can tell
          // if it was cancelled because it transitions to readyState=4, then
          // silently transitions to readyState=0.
          if (xhr.readyState == 1) {
            gPendingSaveRequest = xhr;
          }
          else if (xhr.readyState == 4) {
            gPendingSaveRequest = null;
            setTimeout(function () {
              if (xhr.readyState == 0) innercb.cancelled();
            }, 0);
          }
        };
        xhr.onload = function () {
          gPendingSaveRequest = null;

          if (xhr.status != 200) {
            innercb.failed(xhr.statusText);
            return;
          }

          var m = stringToModel(xhr.responseText);
          var projres = RES(gProject.res.Value);
          if (! transRes)
            transRes = m.source(PROP('cx:project'), projres);

          var revision = m.target(transRes, PROP('cx:revision'));
          gProject.revision = revision ? revision.value : "0";

          var wsref = m.target(transRes, PROP('cx:wsref'));
          if (wsref)
            new_wsref = wsref.value;

          setTimeout(saveProjectToServer_step, 0, "downloadNextFile");
        };

        var xmlok = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n\n<ok/>\n";
        xhr.send(xmlok);
      }
      catch (ex) {
        innercb.failed(ex);
      }
    }
    else if (step == "downloadNextFile") {
      setTimeout(saveProjectToServer_step, 0, "finishDownloads");
    }
    else if (step == "finishDownloads") {
      setTimeout(saveProjectToServer_step, 0, "finished");
    }
    else if (step == "finished") {
      if (new_wsref)
        gProject.wsref = new_wsref;
      innercb.succeeded();
    }
  }

  saveProjectToServer_step("start");
}


/**
 * Saves the list of tabs currently open.
 */
function saveOpenTabs () {
  var ds = gProject.localDS;

  var rdfsvc = getRDFService();
  var opentabsarc = rdfsvc.GetResource(Cx.NS_CX + "opentabs");
  var opentabs = ds.GetTarget(gProject.res, opentabsarc, true);
  if (! opentabs) {
    opentabs = rdfsvc.GetAnonymousResource();
    ds.Assert(gProject.res, opentabsarc, opentabs, true);
  }
  opentabs = new RDFSeq(ds, opentabs);

  // Clear the old list of open tabs
  opentabs.clear();

  for (var i = 0; i < gFrameLoader.frames.length; i++) {
    var frame = gFrameLoader.frames[i];
    if (frame.temporary) continue;
    if (frame != gFrameLoader.currentFrame)
      opentabs.push(frame.docres);
  }
  if (gFrameLoader.currentFrame && ! gFrameLoader.currentFrame.temporary)
    opentabs.push(gFrameLoader.currentFrame.docres);
}


/**
 * Writes out all open documents.
 */
function writeProjectFiles () {
  var ds = gProject.ds;
  ds.beginUpdateBatch();

  try {
    // Save all open frames
    gFrameLoader.saveAllFrames();

    // Purge unreachable statements once, prior to media clean-up...
    gProject.purgeUnreachableStatements();

    // Remove broken media resources
    var medialist = getBrokenMediaResources();
    var rdfsvc = getRDFService();
    var typearc = rdfsvc.GetResource(Cx.NS_RDF + "type");
    for (var i = 0; i < medialist.length; ++i) {
      var mediares = medialist[i];
      try {
        deleteAllRDFArcsIn(ds, mediares);
        var typeres = ds.GetTarget(mediares, typearc, true);
        if (typeres)
          ds.Unassert(mediares, typearc, typeres);
      }
      catch (ex) {
        dump("*** writeProjectFiles: " + ex + "\n");
      }
    }

    // Remove unassociated media files
    var filelist = getUnassociatedMediaFiles();
    for (var i = 0; i < filelist.length; ++i) {
      try {
        filelist[i].remove(false);
      }
      catch (ex) {
        dump("*** writeProjectFiles: " + ex + "\n");
      }
    }

    // ... purge again now that media clean-up has been done.
    gProject.purgeUnreachableStatements();

  // Mark a new modification date on the project
  gProject.modified = new Date();
  }
  catch (ex) {
    throw ex;
  }
  finally {
    ds.endUpdateBatch();
  }

  // Write RDF to disk
  gProject.flush();
}


/**
 * Writes the Celtx project to a zip file.
 */
function archiveCeltxProject (file, callback) {
  var IFile = Components.interfaces.nsIFile;

  var deleteBackup = true;
  if (gWindow.backupFile) {
    deleteBackup = false;
  }
  else {
    var backupname = file.leafName.replace(/\.t?celtx$/, "") + " ("
      + gApp.getText("Recovery").toLowerCase() + ").celtx";
    backupname = sanitizeFilename(backupname);
    if (file.exists() && ! gSaveToTempFile)
      gWindow.backupFile = copyToUnique(file, file.parent, backupname, true);
  }

  var tmpfile = gSaveToTempFile ? tempFile("celtx") : null;

  var zipwriter = getZipWriter();
  // PR_RDWR | PR_CREATE_FILE | PR_TRUNCATE
  zipwriter.open(gSaveToTempFile ? tmpfile : file, 0x04 | 0x08 | 0x20);
  var entries = gProject.projectFolder.directoryEntries;
  var queue = [];
  while (entries.hasMoreElements()) {
    var entry = entries.getNext().QueryInterface(IFile);
    if (! entry.isFile() || entry.leafName.match(/\.t?celtx$/))
      continue;
    queue.push(entry);
  }

  var current = 0;
  var innercb = {
    aborted: false,


    succeeded: function () {
      if (this.aborted) return;

      gPendingSaveRequest = null;

      if (callback)
        callback.succeeded();
    },
    cancelled: function () {
      gPendingSaveRequest = null;

      if (callback)
        callback.cancelled();
    },
    failed: function (error) {
      if (this.aborted) return;

      gPendingSaveRequest = null;

      if (callback)
        callback.failed(error);
    },
    progress: function (current, total) {
      if (this.aborted) return;

      if (callback)
        callback.progress(current, total);
    },
    abort: function () {
      this.aborted = true;
      this.cancelled();
    }
  };
  gPendingSaveRequest = innercb;

  function archiveNextEntry () {
    if (innercb.aborted)
      return;

    if (current < queue.length) {
      innercb.progress(current, queue.length);
      var entry = queue[current++];
      var compLevel = Components.interfaces.nsIZipWriter.COMPRESSION_DEFAULT;
      try {
        zipwriter.addEntryFile(entry.leafName, compLevel, entry, false);
        setTimeout(archiveNextEntry, 0);
      }
      catch (ex) {
        try { zipwriter.close(); } catch (ex2) {}
        innercb.failed(ex);
      }
    }
    else {
      innercb.progress(queue.length, queue.length);

      try {
        zipwriter.close();

        var zipreader = getZipReader();
        zipreader.open(gSaveToTempFile ? tmpfile : file);
        zipreader.test(null);
        zipreader.close();


        if (gSaveToTempFile) {
          overwriteFileWithFile(file, tmpfile);
          try {
            tmpfile.remove(false);
          } catch (ex2) {}
        }
        else if (gWindow.backupFile && deleteBackup) {
          gWindow.backupFile.remove(false);
          gWindow.backupFile = null;
        }

        innercb.succeeded();
      }
      catch (ex) {
        if (! gSaveToTempFile && gWindow.backupFile
            && gWindow.backupFile.exists()) {
          try {
            file.remove(false);
          }
          catch (ex2) {}
          try {
            gWindow.backupFile.copyTo(file.parent, file.leafName);
          }
          catch (ex2) {}
        }
        innercb.failed(ex);
      }
    }
  }

  setTimeout(archiveNextEntry, 0);
}


// Server synchronization support

function prepareUploadModel () {
  // Create the sync directory and temporary RDF model
  var syncdir = getTempDir();
  syncdir.append("sync");
  syncdir.createUnique(1, 0700);

  var srcrdffile = gProject.projectFolder;
  srcrdffile.append(Cx.PROJECT_FILE);
  srcrdffile.copyTo(syncdir, Cx.PROJECT_FILE);
  var dstrdffile = syncdir.clone();
  dstrdffile.append(Cx.PROJECT_FILE);

  var rdfsvc = getRDFService();
  var ds = rdfsvc.GetDataSourceBlocking(fileToFileURL(dstrdffile));

  var model = new RDFModel(ds);
  updateFileMetaData(model, PROP('cx:localFile'), PROP('cx:fileSize'));
  updateFileMetaData(model, PROP('cx:auxFile'  ), PROP('cx:auxSize' ));

  return ds;
}


function updateFileMetaData (model, fileProp, sizeProp) {
  var i, res, leaf, file;
  var stmts = model.find(null, fileProp, null);

  for (i = 0; i < stmts.length; i++) {
    res  = stmts[i][0];
    leaf = stmts[i][2];
    file = gProject.projectFolder;
    file.append(leaf.value);
    if (! file.exists()) {
      dump("*** updateFileMetaData: file not found: " + leaf + "\n");
      continue;
    }
    setLiteralProp(model, res, sizeProp, LIT(file.fileSize));
  }
}


function stringToModel (str) {
  var ios = getIOService();
  var uri = ios.newURI(Cx.PROJECTS_URL, null, null);

  var ds = getRDFXMLDataSource();
  var p  = getRDFXMLParser();
  p.parseString(ds, uri, str);

  var m = new RDFModel(ds);

  return m;
}
