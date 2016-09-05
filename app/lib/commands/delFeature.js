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

import Promise from 'bluebird';

function delFeature (id) {
    const binder = this.binder;
    const shell = this.shell;
    const self = this;
    const uid = this.getUser();
    const gid = this.getGroup();
    const lid = this.getLayer();
    const fid = this.getFeature() || id;
    const inFeature = !!(this.getFeature());

    const resolver = (resolve, reject) => {
        binder.delFeature(uid, gid, lid, fid)
            .then(() => {
                shell.historyPushContext([uid, gid, lid])
                    .then(() => {
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


export default {
    name: 'del_feature',
    command: delFeature
};
