/*
 * app/lib/commands/listCommands.js
 *     
 * 
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 * 
 * License in LICENSE file at the root of the repository.
 *
 */



function listCommands () {
    const commands = this.commands;
    for(const k in commands){
        this.sys.stdout.write(k);
    }
    return this.end();
}

export default {
    name: 'lc',
    command: listCommands
};