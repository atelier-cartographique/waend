/*
 * app.js
 *
 *
 * Copyright (C) 2014  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */


var config = require('../config'),
    db = require('../lib/db'),
    store = require('../lib/store'),
    cache = require('../lib/cache'),
    indexer = require('../lib/indexer'),
    notifier = require('../lib/notifier'),
    server = require('../lib/server'),
    routes = require('../routes');

// config storage
db.configure(config.pg);
store.configure(config.cache);
indexer.configure(config.solr);
cache.configure();

app = server(config.server);
routes(app);

function postStart(app, ex_server){
    notifier.configure(ex_server, '/notify');
}

app.start(postStart);
