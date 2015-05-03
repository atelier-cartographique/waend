/*
 * app/lib/commands/user/listGroups.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */


var Promise = require("bluebird");

function listGroups () {
    var self = this,
        userId = self.data.id,
        shell = self.shell,
        stdout = self.sys.stdout,
        binder = self.binder,
        terminal = self.shell.terminal;

    var res = function(resolve, reject){
        binder.getGroups(userId)
            .then(function(groups){
                for(var i = 0; i < groups.length; i++){
                    var group = groups[i];
                    var cmd = terminal.makeCommand({
                        'args': [
                            'cc /'+userId+'/'+group.id,
                            'get'
                            ],
                        'text': group.id
                    });
                    stdout.write(cmd, ' ', group.get('name') || '');
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
