/*
 * app/lib/commands/layer/detach.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */

'use strict';

var Promise = require('bluebird');

function detach (path) {
    var comps = path.split('/');
    if (comps[0].length === 0) { 
        comps = comps.slice(1);
    }
    var uid = comps[0],
        gid = comps[1],
        lid = comps[2];
    if(!!uid && !!gid && !!lid){
        return this.binder.detachLayerFromGroup(uid, gid, lid);
    }
    return Promise.reject('wrong argument, expecting /user_id/group_id/layer_id');
}


module.exports = exports = {
    name: 'detach',
    command: detach
};
