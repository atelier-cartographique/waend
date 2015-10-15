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
                    var gIdtrim = '{id:'+group.id.substr(0, 3)+'\u2026'+'} ';
                    var gName = group.get('name');
                        if (gName === '' || gName == null) { 
                            gName = '- unnamed map';
                        };
                    var cmd = terminal.makeCommand({
                        'args': [
                            'cc /'+userId+'/'+group.id,
                            'get'
                            ],
                        'text': gName
                    });
                    stdout.write(gIdtrim, cmd || '');
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
