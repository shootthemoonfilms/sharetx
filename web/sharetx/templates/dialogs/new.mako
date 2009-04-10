<!DOCTYPE html>
<html>

<head>
    <title>New</title>
    <link rel="stylesheet" type="text/css" href="/css/style.css" />
    <script type="text/javascript" src="/js/include.js?prototype,sharetx.upload"></script>
</head>

<body class="dialog">
    <form action="/project/new?gp.fileupload.id=1" name="new" id="new" method="post" enctype="multipart/form-data">
        <label for="project_file">File:</label>
        <input type="file" name="project_file" id="project_file" />
    
        <label for="m">Comment:</label>
        <textarea name="m" id="m"></textarea>

        <div class="progress"><div class="bar" id="progress_bar"></div></div>
        <button type="button" id="test">Upload</button>
    </form>
    <script type="text/javascript">
        Upload.init("new");
        Event.observe("test", "click", function() {
            $("new").request({
                onProgress: function(progress) {
                    $("progress_bar").style.width = progress.percent + "%";
                },
                onComplete: function(transport) {
                    Windows.getFocusedWindow().close();
                }
            });
        });
    </script>
</body>

</html>