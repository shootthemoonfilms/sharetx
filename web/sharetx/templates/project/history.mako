<!DOCTYPE html>
<html>

<head>
    <title>Project history</title>
</head>

<body>

<table class="zebra">
    <thead>
        <tr>
            <th>Revision</th>
            <td>Comment</td>
            <td>User</td>
            <td>Modified</td>
            <td></td>
        </tr>
    </thead>
    <tbody>
        % for rev in c.history:
        <tr>
            <th>${rev.revision}</th>
            <td>${rev.message}</td>
            <td>${rev.author}</td>
            <td>${rev.modified}</td>
            % if rev.revision == c.revision:
            <td><b>Current</b></td>
            % else:
            <td><a href="#" onclick="Project.openRevision('${rev.revision}'); return false;">open</a></td>
            %endif
        </tr>
        % endfor
    </tbody>
</table>

</body>
</html>