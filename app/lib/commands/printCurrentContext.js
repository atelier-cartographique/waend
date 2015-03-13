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
    var terminal = this.shell.terminal;
    var current = this.current();
    var crt = [];
    for(var i=0; i < current.length; i++){
        var m = db.get(current[i]);
        var s = current.slice(0, i+1);
        var cmd = terminal.makeCommand({
            args:['cc', '/'+s.join('/')],
            text: (m.get('name') || current[i])
        });
        crt.push('/');
        crt.push(cmd);
    }
    if(crt.length > 0){
        terminal.write.apply(terminal, crt);
    }
    else{
        terminal.write('/');
    }
    return this.end();
};


module.exports = exports = {
    name: 'pcc',
    command: pcc
};

