/*
 * app/lib/commands/listCommands.js
 *     
 * 
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 * 
 * License in LICENSE file at the root of the repository.
 *
 */



function listCommands () {
    var commands = this.commands;
    for(var k in commands){
        this.sys.stdout.write(k);
    }
    return this.end();
};


module.exports = exports = {
    name: 'lc',
    command: listCommands
};