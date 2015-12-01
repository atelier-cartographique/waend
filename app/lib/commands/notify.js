/*
 * app/lib/commands/notify.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */

var SyncHandler = require('./SyncHandler');

function notify () {
    var self = this,
        shell = self.shell,
        stdout = self.sys.stdout,
        terminal = shell.terminal,
        container = document.createElement('div'),
        sync = new SyncHandler(container, self);

    var wc = terminal.makeCommand({
        fragment: container,
        text: 'notifications'
    });

    stdout.write(wc);
    sync.start();
    return self.end();
};


module.exports = exports = {
    name: 'notify',
    command: notify
};
