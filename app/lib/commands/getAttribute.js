/*
 * app/lib/commands/getAttribute.js
 *     
 * 
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 * 
 * License in LICENSE file at the root of the repository.
 *
 */


function getAttr (key) {
    var self = this,
        shell = self.shell,
        terminal = shell.terminal;
        
    terminal.write(key+' => '+self.data.get(key));
    return self.end();
};


module.exports = exports = {
    name: 'get',
    command: getAttr
};