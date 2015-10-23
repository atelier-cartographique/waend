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
    require('./logout'),
    require('./echo'),
    require('./read'),
    require('./changeContext'),
    require('./printCurrentContext'),
    require('./setAttribute'),
    require('./getAttribute'),
    require('./delAttribute'),
    require('./create'),
    require('./createGroup'),
    require('./region'),
    require('./zoom'),
    require('./pan'),
    require('./filter'),
    require('./drawLine'),
    require('./trace'),
    require('./navigate'),
    require('./view'),
    require('./media'),
    require('./select'),
    require('./close'),
    require('./textEdit'),
    require('./help'),
    require('./lookup'),
    require('./delFeature'),
    require('./attach'),
    require('./detach'),
    require('./styleWidget'),
    ];


for (var idx = 0 ; idx < commandModules.length; idx++) {
    var command = commandModules[idx];

    module.exports[command.name] = command.command;
}
