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
    cache = require('../lib/cache'),
    notifier = require('../lib/notifier'),
    server = require('../lib/server'),
    routes = require('../routes');

// config storage
db.configure(config.pg);
cache.configure(config.cache);

app = server(config.server);
routes(app);

function postStart(app, ex_server){
    notifier(ex_server, '/notify');
};

app.start(postStart);


