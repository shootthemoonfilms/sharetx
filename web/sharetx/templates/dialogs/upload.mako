<!DOCTYPE html>
<html>

<head>
    <title>Upload</title>
    <link rel="stylesheet" type="text/css" href="/css/style.css" />
    <script type="text/javascript" src="/js/include.js?prototype,sharetx.upload"></script>
</head>

<body class="dialog">
    <form action="/project/upload" name="upload" id="upload" method="post" enctype="multipart/form-data">
        <label for="project_file">File:</label>
        <input type="file" name="project_file" id="project_file" />
    
        <label for="m">Comment:</label>
        <textarea name="m" id="m"></textarea>

        <button type="button" id="test">Upload</button>
    </form>
    <script type="text/javascript">
        Upload.init("upload");
        Event.observe("test", "click", function() {
            $("upload").request({
                progress: "project_file",
                onComplete: function(transport) {
                    Windows.getFocusedWindow().close();
                }
            });
        });
    </script>
</body>

</html>