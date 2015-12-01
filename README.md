# waend
wænd platform, http://www.waend.com


## Install

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
browserify app/src/wview.js  > bin/wview.js
browserify app/src/libworker.js  > bin/libworker.js
```

Hey, you're done!

## Run

The program does not serve assets. You have to provide them through other means, here we use nginx for this purpose. 

If needed, check if started with 

```bash
sudo service nginx status
```
and if needed, start it with

```bash
sudo service nginx start
```

Once it's set

```bash
npm start
```

Go to http://your.host/register to create a new user, than enjoy http://your.host/map

The your.host part can be configured, and used locally. By example, to be able to access it through http://waend.local, create a text file named waend.local in /etc/nginx/sites-enabled and copy the content of the example file documentation/site-enabled-example/waend.local. Edit it according to your own system (tip : the "pierre" must probably be changed...).

### Errors & tips

You will probably need node 10, the newer versions returns errors with some modules.  

To install a specific version of node with brew, use : 

```bash
brew tap homebrew/versions
```

Then search for your desired package:

```bash
brew search node
```

This might give you the follow results:

```bash
homebrew/versions/node012
homebrew/versions/node010
homebrew/versions/node08
homebrew/versions/node06
homebrew/versions/node04
node nodebrew leafnode nodenv
```

And then install the desired version:

```bash
brew install homebrew/versions/node012
```

Which installs the latest node 0.12.x
