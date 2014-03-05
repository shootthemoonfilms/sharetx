# SHARETX

## How to patch celtx to be able to use this server

1. Find the celtx.jar file inside the chrome directory in your celtx installation directory.
2. Unzip it
3. Rename ``celtx.jar`` to some other name like ``celtx.jar.original``
4. Apply the patch shartx.patch to the ``celtx/chrome`` directory or add the following line to ``celtx.js`` file around line 3839:
```
     // Ignore our own special files
     if (entry.leafName == "project.rdf" ||
         entry.leafName == "local.rdf" ||
+        entry.leafName.match(/^sharetx./) ||
         entry.leafName.match(/\.celtx$/))
       continue;
```

