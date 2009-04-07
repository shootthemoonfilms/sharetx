<!DOCTYPE html>
<html>

<head>
    <title>sharetx.com</title>
    <link rel="stylesheet" type="text/css" href="/css/style.css" />
</head>

<body class="index">
    <div id="logo">
        <a href="/"><img src="/logo.png" /></a>
    </div>

    <div>Share your <a href="http://www.celtx.org">celtx</a> scripts for free!</div>

    <div id="access">
        <p>${c.message}</p>

        <form action="/user/access" method="post">
            <label for="username">Username:</label>
            <input type="text" name="username" id="username" />

            <label for="password">Password:</label>
            <input type="password" name="password" id="password" />
    
            <input type="checkbox" name="remember" id="remember" />
            <label for="remember">Remember me</label>
    
            <button type="submit" name="action" value="login">Login</button>

            <label for="email">Email:</label>
            <input type="text" name="email" id="email" />

            <button type="submit" name="action" value="create">Create Account</button>
        </form>
    </div>
</body>

</html>