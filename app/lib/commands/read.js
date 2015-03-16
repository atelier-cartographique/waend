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
        shell = self.shell,
        stdin = self.sys.stdin,
        stdout = self.sys.stdout;
    var res = function(resolve, reject){
        shell.terminal.input();
        stdin.read()
            .then(function(line){
                stdout.write(line);
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