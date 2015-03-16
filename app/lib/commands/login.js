/*
 * app/lib/commands/login.js
 *     
 * 
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 * 
 * License in LICENSE file at the root of the repository.
 *
 */


var querystring = require('querystring'),
    Transport = require('../Transport'),
    config = require('../../../config');

function login (username, password) {
    var transport = new Transport(),
        shell = this.shell,
        stdout = this.sys.stdout,
        terminal = shell.terminal,
        binder = this.binder;

    return transport.post(config.public.loginUrl, {
        'headers': {'Content-Type': 'application/x-www-form-urlencoded'},
        'body': querystring.stringify({
            'username': username,
            'password': password
        })
    }).then(function(){
        return binder.getMe()
            .then(function(user){
                shell.user = user;
                var cmd = terminal.makeCommand({
                    'args': ['cc', '/' + user.id],
                    'text': 'my context'
                })
                stdout.write('OK login ', cmd);
                return user;
        });
    });
};


module.exports = exports = {
    name: 'login',
    command: login
};
