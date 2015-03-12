/*
 * app/lib/commands/read.js
 *     
 * 
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 * 
 * License in LICENSE file at the root of the repository.
 *
 */


var Promise = require("bluebird");

function read () {
    var self = this,
        terminal = self.shell.terminal;
    var res = function(resolve, reject){
        terminal.read()
            .then(function(line){
                terminal.write(line);
                resolve();
            })
            .catch(reject);
    }
    return (new Promise(res));
};


module.exports = exports = {
    name: 'read',
    command: read
};