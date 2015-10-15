/*
 * app/lib/commands/group/listFeatures.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */


var Promise = require("bluebird");

function listFeatures () {
    var self = this,
        current = self.current(),
        userId = current[0],
        groupId = current[1],
        layerId = current[2],
        shell = self.shell,
        stdout = self.sys.stdout,
        binder = self.binder,
        terminal = shell.terminal;

    var res = function(resolve, reject){
        binder.getFeatures(userId, groupId, layerId)
            .then(function(features){
                for(var i = 0; i < features.length; i++){
                    var feature = features[i];
                    var fIdtrim = '•'+feature.id.substr(0, 3)+'\u2026';
                    var fName = feature.get('name');
                        if (fName === '' || fName == null) { 
                            fName = fIdtrim;
                        };
                    var cmd = terminal.makeCommand({
                        'args': [
                            'cc /'+userId+'/'+groupId+'/'+layerId+'/'+feature.id,
                            'gg | region set'
                            ],
                        'text': fName
                    });
                    stdout.write(cmd || '');
                }
                resolve();
            })
            .catch(reject);
    }
    return (new Promise(res));
};


module.exports = exports = {
    name: 'listFeatures',
    command: listFeatures
};
