/*
 * app/lib/commands/group/listLayers.js
 *     
 * 
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 * 
 * License in LICENSE file at the root of the repository.
 *
 */


var Bind = require('../../Bind'),
    Promise = require("bluebird");

function listLayers () {
    var self = this,
        current = self.current(),
        userId = current[0],
        groupId = current[1],
        terminal = self.shell.terminal;

    var res = function(resolve, reject){
        Bind.get()
            .getLayers(userId, groupId)
            .then(function(layers){
                for(var i = 0; i < layers.length; i++){
                    var layer = layers[i];
                    var cmd = terminal.makeCommand({
                        'args': ['cc', '/'+userId+'/'+groupId+'/'+layer.id],
                        'text': (layer.get('name') || layer.id)
                    });
                    terminal.write(': ', cmd);
                }
                resolve();
            })
            .catch(reject);
    }
    return (new Promise(res));
};


module.exports = exports = {
    name: 'listLayers',
    command: listLayers
};
