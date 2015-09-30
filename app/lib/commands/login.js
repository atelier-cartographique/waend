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
    Promise = require('bluebird'),
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
                    var cmd1 = terminal.makeCommand({
                        'args': [
                            'cc /' + user.id,
                            'get'],
                        'text': 'my public infos'
                    });
                    var cmd2 = terminal.makeCommand({
                        'args': [
                            'cc /' + user.id,
                            'lg'],
                        'text': 'my maps'
                    });
                    stdout.write('Logged in - Go to ', cmd1, ' or ', cmd2);
                    return user;
            });
        });
    };

    if (username && password) {
        return remoteLogin(username, password);
    }
    else if (username) {
        stdout.write('password:');
        terminal.input(stdin);
        return stdin.read().then(function(pwd){
            return remoteLogin(username, pwd);
        });
    }
    else {

        var resolver = function (resolve, reject) {
            stdout.write('e-mail:');
            terminal.input(stdin);
            stdin.read()
                .then(function(username){
                    stdout.write('password:');
                    terminal.input(stdin);
                    document.getElementById("command-line").type="password";
                    stdin.read()
                        .then(function(pwd){
                        remoteLogin(username, pwd)
                            .then(resolve)
                            .catch(reject);
                    });
            });
        };
        return (new Promise(resolver));
    }
}


module.exports = exports = {
    name: 'login',
    command: login
};
