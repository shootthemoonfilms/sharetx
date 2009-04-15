<!DOCTYPE html>
<html>

<head>
    <title>sharetx.com</title>
    <link rel="stylesheet" type="text/css" href="/css/style.css" />
    <script type="text/javascript">var hash='${c.hash}';</script>
    <script type="text/javascript" src="/js/include.js?prototype,sharetx.home">var hash='${c.hash}';</script>
</head>

<body class="index">
    <div id="logo">
        <a href="/"><img src="/logo.png" /></a>
    </div>

    <div>Backup and share your <a href="http://www.celtx.com" target="_blank">celtx</a> scripts for free!</div>

    <div id="access">
        <ul id="tabs">
            <li id="login_tab">Login</li>
            <li id="create_tab">Create Account</li>
            <li id="reset_tab">Reset Password</li>
        </ul>
        <p class="${c.message_class}">${c.message}</p>

        <form method="post" id="access_form" style="display: none">
            <label for="username" id="username_label">Username:</label>
            <input type="text" name="username" id="username" value="${c.username}" />

            <label for="password" id="password_label">Password:</label>
            <input type="password" name="password" id="password" />

            <input type="checkbox" name="remember" id="remember" />
            <label for="remember" id="remember_label">Remember me</label>

            <button type="submit" name="action" id="login" value="login">Login</button>

            <label for="password_confirmation" id="password_confirmation_label">Confirm:</label>
            <input type="password" name="password_confirmation" id="password_confirmation" />

            <label for="email" id="email_label">Email:</label>
            <input type="text" name="email" id="email" value="${c.email}" />

            <button type="submit" name="action" id="create" value="create">Create Account</button>
            <button type="submit" name="action" id="reset" value="reset">Reset Password</button>
        </form>
    </div>

    <div>Visit the <a href="http://sharetx.googlecode.com" target="_blank">development page at google code</a>.</div>
</body>

</html>