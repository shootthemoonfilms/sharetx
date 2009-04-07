function MediaManager (project) {
  this.project = project;
  this.ds = project.ds;
  this.rdf = getRDFService();

  this.checkMediaAttributes();
}

MediaManager.prototype = {
  /**
   * Decode an image file. Throws an exception if decoding failed.
   * @param file{nsILocalFile}  an image file
   * @type imgIContainer
   * @return the decoded image
   */
  decodeImageFile: function (file) {
    // Step 1: Build buffered input stream around file
    var bfis = getBufferedFileInputStream(file);


    // Step 2: Get mime type by peeking at stream
    var sniffer = Components.classes["@mozilla.org/network/content-sniffer;1"]
      .createInstance(Components.interfaces.nsIContentSniffer);
    // We need to QI to a seekable stream, because we have to rewind the
    // stream after we sniff the type.
    var seekin = bfis.QueryInterface(Components.interfaces.nsISeekableStream);
    // We also need a scriptable input stream so that we can read
    // a few bytes from the stream to pass to the sniffer.
    var sis = Components.classes["@mozilla.org/scriptableinputstream;1"]
      .createInstance(Components.interfaces.nsIScriptableInputStream);
    sis.init(bfis);

    // Peeking at 16 bytes should be more than enough
    var peekedstr = sis.read(16);
    var peekedbytes = [];
    // Note: If a null byte shows up in the data we're peeking at,
    // peekedstr will be truncated to whatever came before the null byte.
    for (var i = 0; i < peekedstr.length; ++i)
      peekedbytes[i] = peekedstr.charCodeAt(i);
    var mimetype = sniffer.getMIMETypeFromContent(null,
      peekedbytes, peekedbytes.length);
    if (! mimetype || mimetype.indexOf("image/") != 0) {
      bfis.close();
      throw "Non-image mime-type: " + mimetype;
    }

    // Reset the input stream
    seekin.seek(0, 0);

    // Step 3: Decode to an image container
    try {
      var tools = Components.classes["@mozilla.org/image/tools;1"]
        .createInstance(Components.interfaces.imgITools);
      var ocontainer = { value: null };
      tools.decodeImageData(bfis, mimetype, ocontainer);
      return ocontainer.value;
    }
    catch (ex) {
      throw ex;
    }
    finally {
      bfis.close();
    }
  },


  /**
   * Set the width and height attributes for all images.
   */
  checkMediaAttributes: function () {
    var IRes = Components.interfaces.nsIRDFResource;
    var typearc = this.rdf.GetResource(Cx.NS_RDF + "type");
    var widtharc = this.rdf.GetResource(Cx.NS_CX + "width");
    var heightarc = this.rdf.GetResource(Cx.NS_CX + "height");
    var imagetype = this.rdf.GetResource(Cx.NS_CX + "Image");
    var images = this.ds.GetSources(typearc, imagetype, true);
    while (images.hasMoreElements()) {
      var imageres = images.getNext().QueryInterface(IRes);
      if (this.ds.hasArcOut(imageres, widtharc) &&
          this.ds.hasArcOut(imageres, heightarc))
        continue;

      try {
        var file = this.fileForMedia(imageres);
        if (! isReadableFile(file))
          continue;
        var imgcontainer = this.decodeImageFile(file);
        if (imgcontainer) {
          setRDFString(this.ds, imageres, widtharc, imgcontainer.width);
          setRDFString(this.ds, imageres, heightarc, imgcontainer.height);
        }
      }
      catch (ex) {
        dump("*** checkMediaAttributes: " + ex + "\n");
      }
    }
  },


  uriForMedia: function (mediares) {
    return fileToFileURL(this.fileForMedia(mediares));
  },


  fileForMedia: function (mediares) {
    var filearc = this.rdf.GetResource(Cx.NS_CX + "localFile");
    var filename = getRDFString(this.ds, mediares, filearc);
    if (! filename) {
      printStackTrace();
      throw "No localFile for media";
    }
    var file = this.project.projectFolder;
    file.append(filename);
    return file;
  },


  mediaForFilename: function (filename) {
    var filearc = this.rdf.GetResource(Cx.NS_CX + "localFile");
    var filelit = this.rdf.GetLiteral(filename);
    var sources = this.ds.GetSources(filearc, filelit, true);
    if (sources.hasMoreElements())
      return sources.getNext().QueryInterface(
        Components.interfaces.nsIRDFResource);
    // Try a sanitized version
    filelit = this.rdf.GetLiteral(safeFileName(filename));
    sources = this.ds.GetSources(filearc, filelit, true);
    if (sources.hasMoreElements())
      return sources.getNext().QueryInterface(
        Components.interfaces.nsIRDFResource);
    return null;
  },


  /**
   * Create a thumbnail for the given media resource, with optional
   * constraints on width or height. It only works for images currently.
   * @param mediares  the media resource
   * @param maxwidth  the maximum width of the thumbnail (optional)
   * @param maxheight  the maximum height of the thumbnail (optional)
   * @type nsIFile
   * @return the thumbnail file
   */
  createThumbnail: function (mediares, maxwidth, maxheight, callback) {
    if (! maxwidth)
      maxwidth = 256;
    if (! maxheight)
      maxheight = 256;

    var file = this.fileForMedia(mediares);
    var nameparts = file.leafName.match(/^(.+)\.([^.]+)$/);
    if (nameparts.length != 3) {
      dump("*** createThumbnail: " + file.leafName
        + " is not a recognizable image name\n");
      callback(false);
      return;
    }

    var thumb = file.clone();
    thumb.leafName = nameparts[1] + "_thumb.png";
    if (! thumb.exists())
      thumb.create(0, thumb.parent.permissions & 0644);
    var bfos = getBufferedFileOutputStream(thumb);

    try {
      var imgcontainer = this.decodeImageFile(file);
      var width = imgcontainer.width;
      var height = imgcontainer.height;
      if (height > maxheight || width > maxwidth) {
        var aspect = width / height;
        if (width > height) {
          width = maxwidth;
          height = Math.floor(maxwidth / aspect);
          if (height > maxheight) {
            width = Math.floor(height * aspect);
            height = maxheight;
          }
        }
        else {
          height = maxheight;
          width = Math.floor(maxheight * aspect);
          if (width > maxwidth) {
            height = Math.floor(width / aspect);
            width = maxwidth;
          }
        }
      }
      var tools = Components.classes["@mozilla.org/image/tools;1"]
        .createInstance(Components.interfaces.imgITools);
      var encodedstream = tools.encodeScaledImage(imgcontainer, "image/png",
        width, height);
      var available = 0;
      while ((available = encodedstream.available()) > 0) {
        bfos.writeFrom(encodedstream, available);
      }
      var thumbarc = this.rdf.GetResource(Cx.NS_CX + "thumbnail");
      setRDFString(this.ds, mediares, thumbarc, thumb.leafName);
    }
    catch (ex) {
      dump("*** createThumbnail: " + ex + "\n");
      thumb = null;
    }
    finally {
      bfos.close();
    }
    callback(thumb);
  },


  getThumbnail: function (mediares, force, maxwidth, maxheight, callback) {
    var thumbarc = this.rdf.GetResource(Cx.NS_CX + "thumbnail");
    var thumbname = getRDFString(this.ds, mediares, thumbarc);
    if (! thumbname)
      return force ? this.createThumbnail(mediares, maxwidth, maxheight, callback) : null;
    var file = this.project.projectFolder;
    file.append(thumbname);
    if (! file.exists() && force)
      return this.createThumbnail(mediares, maxwidth, maxheight, callback);
    callback(file);
    return file;
  },


  /**
   * This function should only be used for creating a media resource
   * for media files that have already been added to the project, but
   * were not added with a corresponding media resource. This is not
   * the correct way to add new media files.
   * @see #addMediaFromFile
   * @param filename  the name of the file in the project folder
   * @type nsIRDFResource
   * @return a resource representing the given file
   */
  createMediaForExistingFilename: function (filename) {
    var file = this.project.projectFolder;
    file.append(filename);
    if (! file.exists())
      throw "File " + filename + " does not exist";

    // Ensure it's a supported media type
    var supported = { image: 1, audio: 1, video: 1 };
    var msvc = getMIMEService();
    var mimeType = msvc.getTypeFromFile(file);
    var type = mimeType.split('/').shift();
    if (! supported[type])
      throw gApp.getText("UnsupportedMediaMsg");

    var typeres;
    switch (type) {
      case "image": typeres = this.rdf.GetResource(Cx.NS_CX + "Image"); break;
      case "audio": typeres = this.rdf.GetResource(Cx.NS_CX + "Audio"); break;
      case "video": typeres = this.rdf.GetResource(Cx.NS_CX + "Video"); break;
    }

    var fileres = this.rdf.GetResource(this.project.mintURI());
    var typearc = this.rdf.GetResource(Cx.NS_RDF + "type");
    var titlearc = this.rdf.GetResource(Cx.NS_DC + "title");
    var filearc = this.rdf.GetResource(Cx.NS_CX + "localFile");

    setRDFString(this.ds, fileres, titlearc, file.leafName);
    setRDFString(this.ds, fileres, filearc, file.leafName);
    this.ds.Assert(fileres, typearc, typeres, true);

    return fileres;
  },


  /**
   * Add a media file to the project and create the corresponding resource.
   * @param file  the media file to add
   * @type nsIRDFResource
   * @return a resource representing the given file
   */
  addMediaFromFile: function (file) {
    var msvc = getMIMEService();
    var mimeType = msvc.getTypeFromFile(file);
    dump("--- addMediaFromFile: " + mimeType + "\n");
    if (mimeType == "application/octet-stream") {
      var ext = file.leafName.match(/\.([^\.]+)$/);
      if (ext) {
        switch (ext[1].toLowerCase()) {
          case "bmp":
            mimeType = "image/bmp"; break;
          case "jpg":
          case "jpeg":
            mimeType = "image/jpeg"; break;
          case "png":
            mimeType = "image/png"; break;
          case "gif":
            mimeType = "image/gif"; break;
        }
      }
    }
    var type = mimeType.split('/').shift();

    // Ensure it's a supported media type
    var supported = { image: 1, audio: 1, video: 1 };

    if (! supported[type])
      throw gApp.getText("UnsupportedMediaMsg");

    var typeres;
    switch (type) {
      case "image": typeres = this.rdf.GetResource(Cx.NS_CX + "Image"); break;
      case "audio": typeres = this.rdf.GetResource(Cx.NS_CX + "Audio"); break;
      case "video": typeres = this.rdf.GetResource(Cx.NS_CX + "Video"); break;
    }

    var dstfile = copyToUnique(file, this.project.projectFolder, file.leafName);

    var fileres = this.rdf.GetResource(this.project.mintURI());
    var typearc = this.rdf.GetResource(Cx.NS_RDF + "type");
    var titlearc = this.rdf.GetResource(Cx.NS_DC + "title");
    var filearc = this.rdf.GetResource(Cx.NS_CX + "localFile");

    setRDFString(this.ds, fileres, titlearc, file.leafName);
    setRDFString(this.ds, fileres, filearc, dstfile.leafName);
    this.ds.Assert(fileres, typearc, typeres, true);

    return fileres;
  },


  /**
   * Presents an open file dialog for the user to pick media files.
   * @param type  "all" (default), "image", "video", or "audio" (optional)
   * @param multiple  true if the user should be able to pick multiple files
   * @type nsIFile[]
   * @return A single nsIFile if multiple is false, an array of nsIFile if
   *         multiple is true, or null if the user cancelled.
   */
  showMediaPicker: function (type, multiple) {
    type = type ? type : "all";

    var fp = getFilePicker();
    var mode = multiple ? fp.modeOpenMultiple : fp.modeOpen;
    fp.init(window, gApp.getText("AddMedia"), mode);
    fp.displayDirectory = getMediaDir();
    if (type == "image")
      fp.appendFilters(fp.filterImages);
    else
      fp.appendFilters(fp.filterAll);

    if (fp.show() != fp.returnOK)
      return null;

    var supportedTypes = {
      image: (type == "image" || type == "all") ? true : false,
      audio: (type == "audio" || type == "all") ? true : false,
      video: (type == "video" || type == "all") ? true : false
    };

    var msvc = getMIMEService();
    var files = [];
    if (multiple) {
      var fileiter = fp.files;
      var ILocalFile = Components.interfaces.nsILocalFile;
      while (fileiter.hasMoreElements()) {
        var file = fileiter.getNext().QueryInterface(ILocalFile);
        var mimetype = msvc.getTypeFromFile(file);
        if (mimetype == "application/octet-stream") {
          var ext = file.leafName.match(/\.([^\.]+)$/);
          if (ext) {
            switch (ext[1].toLowerCase()) {
              case "bmp":
                mimetype = "image/bmp"; break;
              case "jpg":
              case "jpeg":
                mimetype = "image/jpeg"; break;
              case "png":
                mimetype = "image/png"; break;
              case "gif":
                mimetype = "image/gif"; break;
            }
          }
        }
        dump("--- showMediaPicker: " + mimetype + "\n");
        var maintype = mimetype.split("/").shift();
        if (supportedTypes[maintype])
          files.push(file);
      }
    }
    else {
      var mimetype = msvc.getTypeFromFile(fp.file);
      var maintype = mimetype.split("/").shift();
      if (supportedTypes[maintype])
        files.push(fp.file);
    }

    if (files.length == 0)
      throw gApp.getText("UnsupportedMediaMsg");

    setMediaDir(files[0].parent);

    return multiple ? files : files[0];
  }
};
