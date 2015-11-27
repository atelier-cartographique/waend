/*
 * app/lib/Sync.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */


var _ = require('underscore'),
    Sockjs = require('sockjs-client'),
    semaphore = require('./Semaphore');

var pendings = [],
    sock;

function sockOpen () {
    console.log('sync opened', pendings.length);
    for (var i = 0; i < pendings.length; i++) {
        var msg = JSON.stringify(pendings[i]);
        sock.send(msg);
    }
}

function sockMessage (evt) {
    var data = evt.data || '[]';
    try {
        var args = JSON.parse(data);
        if (_.isArray(args) && (args.length > 1)) {
            semaphore.signal.apply(semaphore,
                                   ['sync'].concat(args));
        }
    }
    catch (err) {
        console.error('sync.onmessage', err);
    }
}

function sockClose (exp) {
    console.log('sync closed', exp);
}



module.exports.configure = function (config) {
    sock = new Sockjs(config.url);

    sock.onopen = sockOpen;
    sock.onclose = sockClose;
    sock.onmessage = sockMessage;
};


/**
 * send raw data to the nofify end point
 * @method send
 * @return {bool} true if data has been sent, false if delayed or failed
 */
module.exports.send = function () {
    var args = _.toArray(arguments);
    if (!sock || (sock.readyState !== Sockjs.OPEN)) {
        pendings.push(args);
    }
    else {
        try {
            sock.send(JSON.stringify(args));
            return true;
        }
        catch (err) {
            console.error('Sync.send', err);
        }
    }
    return false;
};


/**
 * subscribe to a channel
 * @method subscribe
 * @param  {string}  type A channel name, which is usually a context name
 * @param  {string}  id   context id
 */
module.exports.subscribe = function (type, id) {
    exports.send('sub', type, id);
}
