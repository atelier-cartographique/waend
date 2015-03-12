/*
 * app/lib/commands/printCurrentContext.js
 *     
 * 
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 * 
 * License in LICENSE file at the root of the repository.
 *
 */



function pcc () {
    var terminal = this.shell.terminal;
    var current = this.current();
    terminal.write('/' + current.join('/'));
    return this.end();
};


module.exports = exports = {
    name: 'pcc',
    command: pcc
};

