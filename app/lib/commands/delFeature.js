/*
 * app/lib/commands/delFeature.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */

// 'use strict';

var Promise = require('bluebird');

function delFeature (id) {
    var binder = this.binder,
        shell = this.shell,
        self = this,
        uid = this.getUser(),
        gid = this.getGroup(),
        lid = this.getLayer(),
        fid = this.getFeature() || id,
        inFeature = !!(this.getFeature()); 

    var resolver = function (resolve, reject) {
        binder.delFeature(uid, gid, lid, fid)
            .then(function () {
                shell.historyPushContext([uid, gid, lid])
                    .then(function(){
                        resolve(0);
                    })
                    .catch(reject);
            })
            .catch(reject);
    };

    if (uid && gid && lid && fid) {
        if (inFeature) {
            return (new Promise(resolver));
        }
        else {
            return binder.delFeature(uid, gid, lid, fid);
        }
    }

    return Promise.reject('MissigArgumentOrWrongContext');
}


module.exports = exports = {
    name: 'del_feature',
    command: delFeature
};
