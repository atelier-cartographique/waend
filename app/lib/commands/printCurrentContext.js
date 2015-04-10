/*
 * app/lib/commands/printCurrentContext.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */

var db = require('../Bind').get().db;

function pcc () {
    var shell = this.shell,
        terminal = shell.terminal,
        current = this.current(),
        stdout = this.sys.stdout,
        crt = [];

    for(var i=0; i < current.length; i++){
        var m = db.get(current[i]);
        var s = current.slice(0, i+1);
        var cmd = terminal.makeCommand({
            args:['cc /'+s.join('/')],
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
};


module.exports = exports = {
    name: 'pcc',
    command: pcc
};
