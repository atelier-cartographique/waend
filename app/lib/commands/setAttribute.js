/*
 * app/lib/commands/setAttribute.js
 *     
 * 
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 * 
 * License in LICENSE file at the root of the repository.
 *
 */



function setAttr (key, val) {
    return this.data.set(key, JSON.parse(val));
};


module.exports = exports = {
    name: 'set',
    command: setAttr
};