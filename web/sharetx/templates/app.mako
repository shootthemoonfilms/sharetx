<!DOCTYPE html>
<html>

<head>
    <title>sharetx.com</title>
    <link rel="stylesheet" type="text/css" href="/css/themes/default.css" />
    <link rel="stylesheet" type="text/css" href="/css/themes/mac_os_x.css" />
    <link rel="stylesheet" type="text/css" href="/css/style.css" />
    <script type="text/javascript" src="/js/include.js?prototype,window,sharetx"></script>
</head>

<body>
    <div id="toolbar">
        <a href="/"><img src="/logo.png" /></a>
        <button id="new" title="Upload new project"><img src="/img/toolbar/new.png" /><div>New</div></button>
        <button id="open" title="Open existing project"><img src="/img/toolbar/open.png" /><div>Open</div></button>
        <div class="separator"></div>
        <button id="download" title="Download current project"><img src="/img/toolbar/download.png" /><div>Download</div></button>
        <button id="upload" title="Upload new version for the current project"><img src="/img/toolbar/upload.png" /><div>Upload</div></button>
        <button id="update" title="Update current project"><img src="/img/toolbar/update.png" /><div>Update</div></button>
        <button id="history" title="See current project's history"><img src="/img/toolbar/history.png" /><div>History</div></button>
        <button id="share" title="Share current project"><img src="/img/toolbar/share.png" /><div>Share</div></button>
        <div class="separator"></div>
        <button id="preferences" title="Edit preferences"><img src="/img/toolbar/preferences.png" /><div>Preferences</div></button>
        <div class="separator"></div>
        <button id="logout" title="Close current session"><img src="/img/toolbar/logout.png" /><div>Logout</div></button>
    </div>

    <div id="workarea">
        <div id="left_sidebar"></div>
        <div id="left_sidebar_toggle"></div>
        <div id="right_sidebar"></div>
        <div id="right_sidebar_toggle"></div>

        <div id="center">
            <div id="center_tabs"></div>
            <div id="center_tabs_content"></div>
        </div>
    </div>
</body>

</html>
