/*
 * app/lib/commands/create.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */


var Promise = require('bluebird'),
    semaphore = require('../Semaphore'),
    region = require('../Region');


function createGroup (uid, ctx, resolve, reject) {
    var binder = ctx.binder,
        stdout = ctx.sys.stdout,
        stdin = ctx.sys.stdin,
        shell = ctx.shell,
        terminal = shell.terminal;

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

                    stdout.write('enter a description');
                    terminal.input(stdin);
                    stdin.read()
                        .then(function(desc){
                            var data = {
                                user_id: uid,
                                status_flag: (pp - 1),
                                properties: {'name':name,'description':desc}
                            };

                            ctx.binder.setGroup(uid, data)
                                .then(function(model){
                                    var cmd = terminal.makeCommand({
                                        args: ['cc /'+uid+'/'+model.id,'get'],
                                        text: (model.get('name') || model.id)
                                    });
                                    stdout.write('created map : ', cmd);
                                    resolve(model);
                                });
                        });
                });
        })
        .catch(reject);
}




function createLayer (uid, gid, ctx, resolve, reject) {
    var binder = ctx.binder,
        stdout = ctx.sys.stdout,
        stdin = ctx.sys.stdin,
        terminal = ctx.shell.terminal;

    stdout.write('enter a name');
    terminal.input(stdin);
    stdin.read()
        .then(function(name){

            stdout.write('enter a description');
            terminal.input(stdin);
            stdin.read()
                .then(function(desc){
                    var data = {
                        user_id: uid,
                        properties: {'name':name,'description':desc}
                    };

                    binder.setLayer(uid, gid, data)
                        .then(function(model){
                            var cmd = terminal.makeCommand({
                                args: ['cc /'+uid+'/'+gid+'/'+model.id,'get'],
                                text: (model.get('name') || model.id)
                            });
                            semaphore.signal('create:layer', model);
                            stdout.write('created layer : ', cmd);
                            resolve(model);
                        });
                });
        })
        .catch(reject);
}




// function createLayer (uid, gid, ctx, resolve, reject) {
//     var binder = ctx.binder,
//         stdout = ctx.sys.stdout,
//         stdin = ctx.sys.stdin,
//         terminal = ctx.shell.terminal;

//     stdout.write('enter a name');
//     terminal.input(stdin);
//     stdin.read()
//         .then(function(name){
//             var data = {
//                 user_id: uid,
//                 properties: {'name':name}
//             };

//             binder.setLayer(uid, gid, data)
//                 .then(function(model){
//                     var cmd = terminal.makeCommand({
//                         args: ['cc /'+uid+'/'+gid+'/'+model.id],
//                         text: (model.get('name') || model.id)
//                     });
//                     stdout.write('created layer ', cmd);
//                     resolve(model);
//                 });
//         })
//         .catch(reject);
// }

function createFeature (uid, gid, lid, ctx, resolve, reject) {
    var binder = ctx.binder,
        stdout = ctx.sys.stdout,
        stdin = ctx.sys.stdin,
        terminal = ctx.shell.terminal,
        extent = region.get(),
        center = extent.getCenter();

        var data = {
            user_id: uid,
            layer_id: lid,
            properties: {},
            geom: JSON.parse(center.format())
        };

        return binder.setFeature(uid, gid, lid, data)
            .then(function(model){
                var cmd = terminal.makeCommand({
                    args: ['cc /'+uid+'/'+gid+'/'+lid+'/'+model.id],
                    text: model.id
                });
                stdout.write('created feature ', cmd);
                resolve(model);
            })
            .catch(reject);
}

function iCreate () {
    var self = this,
        terminal = self.shell.terminal,
        stdout = self.sys.stdout,
        stdin = self.sys.stdin,
        current = self.current();

    stdout.write('To confirm, type the number of your choice in the console');
    stdout.write('To cancel, type anything else');
    stdout.write('Press Enter to validate');
    stdout.write('-');

    if (1 === current.length) {
        stdout.write('1 : create a new map');
    }
    else if (2 === current.length) {
        stdout.write('1 : create a new map');
        stdout.write('2 : create a layer in current map');
    }
    else if (3 === current.length) {
        stdout.write('1 : create a new map');
        stdout.write('2 : create a layer in current map');
        stdout.write('3 : create a feature in current layer');
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
                if(1 === cType){
                    createGroup(current[0], self, resolve, reject);
                }
                else if(2 === cType){
                    createLayer(current[0], current[1], self, resolve, reject);
                }
                else if(3 === cType){
                    createFeature(current[0], current[1], current[2], self, resolve, reject);
                }
            }).catch(reject);
    };

    return (new Promise(resolver));
}


module.exports = exports = {
    name: 'ic',
    command: iCreate
};
