/*
 * app/lib/commands/user/listGroups.js
 *     
 * 
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 * 
 * License in LICENSE file at the root of the repository.
 *
 */


var Bind = require('../../Bind'),
    Promise = require("bluebird");

function listGroups () {
    var self = this,
        userId = self.data.id,
        terminal = self.shell.terminal;
    var res = function(resolve, reject){
        Bind.get()
            .getGroups(userId)
            .then(function(groups){
                for(var i = 0; i < groups.length; i++){
                    var group = groups[i];
                    var cmd = terminal.makeCommand({
                        'args': ['cc', '/'+userId+'/'+group.id],
                        'text': group.id
                    });
                    terminal.write(cmd, ' ', group.get('name') || '');
                }
                resolve();
            })
            .catch(reject);
    }
    return (new Promise(res));
};


module.exports = exports = {
    name: 'listGroups',
    command: listGroups
};
