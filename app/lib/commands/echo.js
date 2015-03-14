/*
 * app/lib/commands/echo.js
 *     
 * 
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 * 
 * License in LICENSE file at the root of the repository.
 *
 */

var _ = require('underscore');


function echo () {
    var self = this,
        terminal = self.shell.terminal,
        args = _.toArray(arguments);
    terminal.write(args.join(' '));
    return self.end();
};


module.exports = exports = {
    name: 'echo',
    command: echo
};