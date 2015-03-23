/*
 * app/lib/commands/layer/attach.js
 *     
 * 
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 * 
 * License in LICENSE file at the root of the repository.
 *
 */

'use strict';

var Promise = require('bluebird');

function attach (guid, gid) {
    if(!!guid && !!gid){
        return this.binder.attachLayerToGroup(guid, gid, this.data.id);
    }
    else if(!!guid){
        if(guid.split('/').length > 1){ // it's a path
            return Promise.reject('path argument not implemented yet');
        }
        else{ // we assume it's a group id
            var db = this.binder.db;
            if(db.has(guid)){
                var group = db.get(guid),
                    gid = group.id,
                    guid = group.get('user_id');
                return this.binder.attachLayerToGroup(guid, gid, this.data.id);
            }
            return Promise.reject('Cannot link to a group you did not visit during this session');
        }
    }
    return Promise.reject('wrong arguments, we at least want a group id');
};


module.exports = exports = {
    name: 'attach',
    command: attach
};