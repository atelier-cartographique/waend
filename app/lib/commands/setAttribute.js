/*
 * app/lib/commands/setAttribute.js
 *     
 * 
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 * 
 * License in LICENSE file at the root of the repository.
 *
 */



function setAttr (key, val) {
    var self = this,
        shell = self.shell,
        terminal = shell.terminal;
    terminal.write('');
    return self.data.set(key, val);
};


module.exports = exports = {
    name: 'set',
    command: setAttr
};