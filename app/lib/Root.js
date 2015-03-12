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

var _ = require('underscore'),
    Context = require('./Context');

function processResult(terminal, result) {
    if(!result){
        terminal.write('No result found');
        return this.conclusion();
    }
    else{
        for(var i = 0; i < result.length; i++){
            var path = '/' + result.user_id + '/' + result.id;
            var line = terminal.makeCommand({
                cmd: 'switchContext',
                args: [path],
                text: (result.properties.name | result.id)
            });
            terminal.write(line);
        }
    }
};

var Root = Context.extend({
    name: 'shell',

    commands:{

        search: function (term) {
            var bind = Bind.get(),
                terminal = this.shell.terminal;

            return bind.searchGroup(term).then(_.partial(processResult, terminal));
        },

        help: function(){
            var terminal = this.shell.terminal;
            terminal.write('hello, not yet written');
            terminal.write('feel free to help :)');
            return this.conclusion();
        },
    }
});


module.exports = exports = Root;
