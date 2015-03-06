/*
 * app/lib/Root.js
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



var Root = Context.extend({
    name: 'shell',

    commands:{
        switchContext: function (path) {
            this.shell.switchContext(path);
            this.shell.terminal.setTitle(path);
        },

        search: function (term) {
            var bind = Bind.get(),
                result = bind.search('group', term),
                terminal = this.shell.terminal;

            if(!result){
                terminal.write('No result found');
            }
            else{
                for(var i = 0; i < result.length; i++){
                    var line = terminal.makeCommand({
                        cmd: 'switchContext',
                        args: ['/'+result.id],
                        text: (result.properties.name | result.id)
                    });
                    terminal.write(line);
                }
            }
        },

        help: function(){
            var terminal = this.shell.terminal;
            terminal.write('hello, not yet written');
        },
    }
});


module.exports = exports = Root;
