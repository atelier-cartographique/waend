/*
 * app/lib/User.js
 *     
 * 
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 * 
 * License in LICENSE file at the root of the repository.
 *
 */

'use strict';

var Context = require('./Context'),
    Bind = require('./Bind');


function listGroups () {

};

function setAttr (key, val) {
    var self = this,
        shell = self.shell,
        terminal = shell.terminal;

    self.data.once('sync', function(){
        terminal.write('set '+ key+' to '+val);
    });
    self.data.set(key,val);
    return self.conclusion();
};

function getAttr (key) {
    var self = this,
        shell = self.shell,
        terminal = shell.terminal;
        
    terminal.write(key+' => '+self.data.get(key));
    return self.conclusion();
};

var User = Context.extend({
    name: 'user',
    commands:{
        'list': listGroups,
        'set': setAttr,
        'get': getAttr
    }
});


module.exports = exports = User;
