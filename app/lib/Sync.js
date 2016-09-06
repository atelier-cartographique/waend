/*
 * app/lib/Sync.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */


import _ from 'underscore';

import Sockjs from 'sockjs-client';
import semaphore from './Semaphore';
import debug from 'debug';
const logger = debug('waend:Sync');

const pendings = [];
let sock;

function sockOpen () {
    logger('sync opened', pendings.length);
    for (let i = 0; i < pendings.length; i++) {
        const msg = JSON.stringify(pendings[i]);
        sock.send(msg);
    }
}

function sockMessage (evt) {
    const data = evt.data || '[]';
    try {
        const args = JSON.parse(data);
        if (_.isArray(args) && (args.length > 1)) {
            const syncArgs = ['sync'].concat(args);
            semaphore.signal(...syncArgs);
        }
    }
    catch (err) {
        console.error('sync.onmessage', err);
    }
}

function sockClose (exp) {
    logger('sync closed', exp);
}



export function configure(config) {
    sock = new Sockjs(config.url);

    sock.onopen = sockOpen;
    sock.onclose = sockClose;
    sock.onmessage = sockMessage;
}

/**
 * send raw data to the nofify end point
 * @method send
 * @return {bool} true if data has been sent, false if delayed or failed
 */
export function send() {
    const args = _.toArray(arguments);
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
}

/**
 * subscribe to a channel
 * @method subscribe
 * @param  {string}  type A channel name, which is usually a context name
 * @param  {string}  id   context id
 */
export function subscribe(type, id) {
    exports.send('sub', type, id);
}
