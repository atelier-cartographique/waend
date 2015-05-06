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
    var self = this,
        transport = new Transport(),
        shell = self.shell,
        stdout = self.sys.stdout,
        stdin = self.sys.stdin,
        terminal = shell.terminal,
        binder = self.binder;


    var remoteLogin = function (username, password) {
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
                        'args': [
                            'cc /' + user.id,
                            'lg'],
                        'text': 'my context'
                    });
                    stdout.write('OK login ', cmd);
                    return user;
            });
        });
    };

    if (password) {
        return remoteLogin(username, password);
    }

    stdout.write('password:');
    terminal.input(stdin);
    return stdin.read().then(function(pwd){
        return remoteLogin(username, pwd);
    });
}


module.exports = exports = {
    name: 'login',
    command: login
};
