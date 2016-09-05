/*
 * app/lib/commands/read.js
 *     
 * 
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 * 
 * License in LICENSE file at the root of the repository.
 *
 */


import Promise from "bluebird";

function read () {
    const self = this;
    const shell = self.shell;
    const stdin = self.sys.stdin;
    const stdout = self.sys.stdout;
    const res = (resolve, reject) => {
        shell.terminal.input(stdin);
        stdin.read()
            .then(line => {
                stdout.write(line);
                resolve();
            })
            .catch(reject);
    };
    return (new Promise(res));
}

export default {
    name: 'read',
    command: read
};