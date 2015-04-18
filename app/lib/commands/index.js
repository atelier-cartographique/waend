/*
 * app/lib/commands/index.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */



var commandModules = [
    require('./listCommands'),
    require('./login'),
    require('./echo'),
    require('./read'),
    require('./changeContext'),
    require('./printCurrentContext'),
    require('./setAttribute'),
    require('./getAttribute'),
    require('./create'),
    require('./region'),
    require('./zoom'),
    require('./pan'),
    require('./filter'),
    require('./drawLine'),
    require('./navigate'),
    require('./media'),
    ];


for (var idx = 0 ; idx < commandModules.length; idx++) {
    var command = commandModules[idx];

    module.exports[command.name] = command.command;
}
