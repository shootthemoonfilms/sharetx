<%def name="filelist(files)">
<ul>
% for file in files:
    %if hasattr(file, 'filelist'):
    <li>
        <a class="icon smallest folder ${file.doctype}" href="#" ondblclick="return false;">${file.title}</a>
        ${filelist(file.filelist)}
    </li>
    %else:
    <li><a class="icon smallest ${file.doctype}" href="#" onclick="return false;" ondblclick="Project.openFile('${file.localfile}', '${file.title}'); return false;">${file.title}</a></li>
    %endif
% endfor
</ul>
</%def>

<!DOCTYPE html>
<html>

<head>
    <title>Project file list</title>
</head>

<body>

    ${filelist(c.files)}

</body>
</html>