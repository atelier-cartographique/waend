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

function processResult(shell, result) {
    var stdout = shell.stdout;
    if(!result){
        stdout.write('No result found');
        return this.end();
    }
    else{
        for(var i = 0; i < result.length; i++){
            var path = '/' + result.user_id + '/' + result.id;
            var line = shell.terminal.makeCommand({
                args: ['cc '+path],
                text: (result.properties.name | result.id)
            });
            stdout.write(line);
        }
    }
};

var Root = Context.extend({
    name: 'shell',

    commands:{

        search: function (term) {
            var bind = Bind.get(),
                terminal = this.shell.terminal;

            return bind.searchGroup(term).then(_.partial(processResult, shell));
        },

        help: function(){
            var stdout = this.shell.stdout;
            stdout.write('hello, not yet written');
            stdout.write('feel free to help :)');
            return this.end();
        },
    }
});


module.exports = exports = Root;
