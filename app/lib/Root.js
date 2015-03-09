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
    querystring = require('querystring'),
    Context = require('./Context'),
    Transport = require('./Transport'),
    Bind = require('./Bind'),
    config = require('../../config');

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

        login: function (username, password) {
            var transport = new Transport(),
                shell = this.shell,
                terminal = shell.terminal;

            return transport.post(config.public.loginUrl, {
                'headers': {'Content-Type': 'application/x-www-form-urlencoded'},
                'body': querystring.stringify({
                    'username': username,
                    'password': password
                })
            }).then(function(){
                return Bind.get()
                    .getMe()
                    .then(function(user){
                        shell.user = user;
                        terminal.write('OK login '+ user.id);
                });
            });
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
