/*
 * app/lib/commands/printCurrentContext.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */

const db = require('../Bind').get().db;

function pcc () {
    const shell = this.shell;
    const terminal = shell.terminal;
    const current = this.current();
    const stdout = this.sys.stdout;
    const crt = [];

    for(let i=0; i < current.length; i++){
        const m = db.get(current[i]);
        const s = current.slice(0, i+1);
        const cmd = terminal.makeCommand({
            args:[`cc /${s.join('/')}`],
            text: (m.get('name') || current[i])
        });
        crt.push('/');
        crt.push(cmd);
    }
    if(crt.length > 0){
        stdout.write.apply(shell.stdout, crt);
    }
    else{
        stdout.write('/');
    }
    return this.end();
}

export default {
    name: 'pcc',
    command: pcc
};
