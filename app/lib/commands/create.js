/*
 * app/lib/commands/setAttribute.js
 *     
 * 
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 * 
 * License in LICENSE file at the root of the repository.
 *
 */


var Promise = require('bluebird');


function createGroup (uid, ctx, resolve, reject) {
    var binder = ctx.binder,
        stdout = ctx.sys.stdout,
        stdin = ctx.sys.stdin,
        terminal = ctx.shell.terminal;

    stdout.write('select a status');
    stdout.write('1 : public');
    stdout.write('2 : private');

    terminal.input(stdin);
    stdin.read()
        .then(function(input){
            var pp = parseInt(input);
            if(!pp || pp > 2){
                return reject('Not a valid value');
            }
            stdout.write('enter a name');
            shell.terminal.input(stdin);
            stdin.read()
                .then(function(name){
                    var data = {
                        user_id: uid,
                        status_flag: (pp - 1),
                        properties: {'name':name}
                    }
                    ctx.binder.setGroup(uid, data)
                        .then(function(model){
                            var cmd = terminal.makeCommand({
                                args: ['cc', '/'+uid+'/'+model.id],
                                text: (model.get('name') || model.id)
                            });
                            stdout.write(cmd);
                            resolve();
                        });
                });
        })
        .catch(reject);
};

function createLayer (uid, gid, ctx, resolve, reject) {
    var binder = ctx.binder,
        stdout = ctx.sys.stdout,
        stdin = ctx.sys.stdin,
        terminal = ctx.shell.terminal;

    stdout.write('enter a name');
    terminal.input(stdin);
    stdin.read()
        .then(function(name){
            var data = {
                user_id: uid,
                properties: {'name':name}
            }
            binder.setLayer(uid, gid, data)
                .then(function(model){
                    var cmd = terminal.makeCommand({
                        args: ['cc', '/'+uid+'/'+gid+'/'+model.id],
                        text: (model.get('name') || model.id)
                    });
                    stdout.write('created layer ', cmd);
                    resolve();
                });
        })
        .catch(reject);
};

function iCreate () {
    var self = this,
        terminal = self.shell.terminal,
        stdout = self.sys.stdout,
        stdin = self.sys.stdin,
        current = self.current();
    
    stdout.write('select type:');
    if (1 === current.length) {
        stdout.write('1 : group');
    }
    else if (2 === current.length) {
        stdout.write('1 : group');
        stdout.write('2 : layer');
    }
    else if (3 === current.length) {
        stdout.write('1 : group');
        stdout.write('2 : layer');
        stdout.write('3 : feature');
    }

    var cType = 0;

    var resolver = function (resolve, reject) {
        terminal.input(stdin);
        stdin.read()
            .then(function(input){
                cType = parseInt(input);
                if(!cType){
                    return reject('Invalid Value');
                }
                if(cType <= 0){
                    return reject('Invalid Value');
                }
                if(cType > 3){
                    return reject('Invalid Value');
                }
                if(cType > 2){
                    return reject('Not Implemented');
                }
                if(1 === cType){
                    createGroup(current[0], self, resolve, reject);
                }
                else if(2 === cType){
                    createLayer(current[0], current[1], self, resolve, reject);
                }
            });
    };

    return (new Promise(resolver));
};


module.exports = exports = {
    name: 'ic',
    command: iCreate
};