# waend
wænd platform, http://www.waend.com


## install

At the very first you need a running PostGIS enabled database, see http://postgis.net/install for instructions.

And Redis server. See http://redis.io/

Then to get dependencies, run the following command from the root of the repository.

```bash
npm install
```

Once you're there, you might want to setup the database schema with the following command

```bash
psql $DB_NAME < sql/schema.sql
```

install browserify, see http://browserify.org/#install

set configuration by copying config_example.json into config.json and editing at your will

then compile the javascript  files with:

```bash
mkdir bin
browserify app/src/wmap.js  > bin/wmap.js
browserify app/src/libworker.js  > bin/libworker.js
```

Hey, you're done!
