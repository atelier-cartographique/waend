/*
 * app/lib/commands/notify.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */

import SyncHandler from './SyncHandler';

function notify () {
    const self = this;
    const shell = self.shell;
    const stdout = self.sys.stdout;
    const terminal = shell.terminal;
    const container = document.createElement('div');
    const sync = new SyncHandler(container, self);

    const wc = terminal.makeCommand({
        fragment: container,
        text: 'notifications'
    });

    stdout.write(wc);
    sync.start();
    return self.end();
}

export default {
    name: 'notify',
    command: notify
};
