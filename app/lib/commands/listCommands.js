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
    var self = this,
        commands = self.commands,
        terminal = self.shell.terminal;
    for(var k in commands){
        terminal.write(k);
    }
    return self.end();
};


module.exports = exports = {
    name: 'lc',
    command: listCommands
};