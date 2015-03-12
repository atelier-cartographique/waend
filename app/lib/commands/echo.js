/*
 * app/lib/commands/echo.js
 *     
 * 
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 * 
 * License in LICENSE file at the root of the repository.
 *
 */



function echo () {
    var self = this,
        terminal = shell.terminal;
    terminal.write.apply(terminal, arguments);
    return self.end();
};


module.exports = exports = {
    name: 'echo',
    command: echo
};