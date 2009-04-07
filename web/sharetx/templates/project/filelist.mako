<!DOCTYPE html>
<html>

<head>
    <title>Project file list</title>
</head>

<body>

    <div class="projectTitle">Project 1</div>
    <ul>
        % for file in c.files:
        <li><a class="icon smallest" href="#" onclick="return false;" ondblclick="Project.openFile('${file.localFile}', '${file.title}'); return false;">${file.title}</a></li>
        % endfor
        <!--li>
            <a class="icon smallest folder" href="#" ondblclick="return false;">Some Folder</a>
            <ul>
                <li><a class="icon smallest" href="#" onclick="return false;" ondblclick="Project.openFile('some_folder/file_1', 'File 1'); return false;">File 1</a></li>
                <li><a class="icon smallest" href="#" onclick="return false;" ondblclick="Project.openFile('some_folder/file_2', 'File 2'); return false;">File 2</a></li>
                <li><a class="icon smallest" href="#" onclick="return false;" ondblclick="Project.openFile('some_folder/file_3', 'File 3'); return false;">File 3</a></li>
            </ul>
        </li-->
    </ul>

</body>
</html>