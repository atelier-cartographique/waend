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
        shell = self.shell,
        args = (arguments.length >  0) ? _.toArray(arguments) : self.sys.stdout.readSync(),
        e = !!args ? args.join(' ') : '';

    self.sys.stdout.write(e);
    return self.end(e);
};


module.exports = exports = {
    name: 'echo',
    command: echo
};