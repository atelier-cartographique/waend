/*
 * app/lib/commands/login.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */


import querystring from 'querystring';

import Transport from '../Transport';
import config from '../../config';

function login (username, password) {
    const transport = new Transport();
    const shell = this.shell;
    const stdout = this.sys.stdout;
    const stdin = this.sys.stdin;
    const terminal = shell.terminal;
    const binder = this.binder;


    const remoteLogin = (username, password) => transport.post(config.public.loginUrl, {
        'headers': {'Content-Type': 'application/x-www-form-urlencoded'},
        'body': querystring.stringify({
            'username': username,
            'password': password
        })
    }).then(() => binder.getMe()
        .then(user => {
            // shell.user = user;
            shell.loginUser(user);
            const cmd1 = terminal.makeCommand({
                'args': [
                    `cc /${user.id}`,
                    'get'],
                'text': 'my public infos'
            });
            const cmd2 = terminal.makeCommand({
                'args': [
                    `cc /${user.id}`,
                    'lg'],
                'text': 'my maps'
            });
            stdout.write('Logged in - Go to ', cmd1, ' or ', cmd2);
            return user;
    }));

    if (username && password) {
        return remoteLogin(username, password);
    }
    else if (username) {
        stdout.write('password:');
        terminal.input(stdin);
        return stdin.read().then(pwd => remoteLogin(username, pwd));
    }
    else {

        const resolver = (resolve, reject) => {
            stdout.write('e-mail:');
            terminal.input(stdin);
            stdin.read()
                .then(username => {
                    stdout.write('password:');
                    terminal.input(stdin);
                    document.getElementById("command-line").type="password";
                    stdin.read()
                        .then(pwd => {
                        remoteLogin(username, pwd)
                            .then(resolve)
                            .catch(reject);
                    });
            });
        };
        return (new Promise(resolver));
    }
}


export default {
    name: 'login',
    command: login
};
