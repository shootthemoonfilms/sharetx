<!DOCTYPE html>
<html>

<head>
    <title>Project share</title>
</head>

<body>

<h1>Public</h1>

<p>This project is not public.</p>
<button>Make this project public</button>

<h1>Groups</h1>

<table class="zebra">
    <thead>
        <tr>
            <th>Group</th>
            <td>Permissions</td>
            <td></td>
        </tr>
    </thead>
    <tfoot>
        <tr>
            <th><a href="#" onclick="Share.addGroup(); return false;">+ Add Group</a></th>
            <td></td>
            <td></td>
        </tr>
    </tfoot>
    <tbody>
        <tr>
            <th>Writers</th>
            <td>Read/Write</td>
            <td><a href="#" onclick="Share.editGroup('Writers', 'rw'); return false;">Edit</a> <a href="#" onclick="Share.deleteGroup('Writers'); return false;">Delete</a></td>
        </tr>
        <tr>
            <th>Producers</th>
            <td>Read/Write</td>
            <td><a href="#" onclick="Share.editGroup('Producers', 'rw'); return false;">Edit</a> <a href="#" onclick="Share.deleteGroup('Producers'); return false;">Delete</a></td>
        </tr>
        <tr>
            <th>Assistants</th>
            <td>Read</td>
            <td><a href="#" onclick="Share.editGroup('Assistants', 'r'); return false;">Edit</a> <a href="#" onclick="Share.deleteGroup('Assistants'); return false;">Delete</a></td>
        </tr>
    </tbody>
</table>

<h1>Users</h1>

<table class="zebra">
    <thead>
        <tr>
            <th>User</th>
            <td>Permissions</td>
            <td></td>
        </tr>
    </thead>
    <tfoot>
        <tr>
            <th><a href="#" onclick="Share.addUser(); return false;">+ Add User</a></th>
            <td></td>
            <td></td>
        </tr>
    </tfoot>
    <tbody>
        <tr>
            <th>cesarizu</th>
            <td>Read/Write</td>
            <td><a href="#" onclick="Share.editUser('cesarizu', 'rw'); return false;">Edit</a> <a href="#" onclick="Share.deleteUser('cesarizu'); return false;">Delete</a></td>
        </tr>
        <tr>
            <th>lorecaice</th>
            <td>Read/Write</td>
            <td><a href="#" onclick="Share.editUser('lorecaice', 'rw'); return false;">Edit</a> <a href="#" onclick="Share.deleteUser('lorecaice'); return false;">Delete</a></td>
        </tr>
    </tbody>
</table>

</body>
</html>
