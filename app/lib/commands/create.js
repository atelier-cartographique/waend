/*
 * app/lib/commands/create.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */


import Promise from 'bluebird';

import semaphore from '../Semaphore';
import region from '../Region';
import debug from 'debug';
const logger = debug('waend:command:create');


function createGroup (uid, ctx, resolve, reject) {
    const binder = ctx.binder;
    const stdout = ctx.sys.stdout;
    const stdin = ctx.sys.stdin;
    const shell = ctx.shell;
    const terminal = shell.terminal;

    stdout.write('select a status');
    stdout.write('1 : public');
    stdout.write('2 : private');

    terminal.input(stdin);
    stdin.read()
        .then(input => {
            const pp = parseInt(input);
            if(!pp || pp > 2){
                return reject('Not a valid value');
            }
            stdout.write('enter a name');
            shell.terminal.input(stdin);
            stdin.read()
                .then(name => {

                    stdout.write('enter a description');
                    terminal.input(stdin);
                    stdin.read()
                        .then(desc => {
                            const data = {
                                user_id: uid,
                                status_flag: (pp - 1),
                                properties: {'name':name,'description':desc}
                            };

                            ctx.binder.setGroup(uid, data)
                                .then(model => {
                                    const cmd = terminal.makeCommand({
                                        args: [`cc /${uid}/${model.id}`,'get'],
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
    const binder = ctx.binder;
    const stdout = ctx.sys.stdout;
    const stdin = ctx.sys.stdin;
    const terminal = ctx.shell.terminal;

    stdout.write('enter a name');
    terminal.input(stdin);
    stdin.read()
        .then(name => {

            stdout.write('enter a description');
            terminal.input(stdin);
            stdin.read()
                .then(desc => {
                    const data = {
                        user_id: uid,
                        properties: {'name':name,'description':desc}
                    };

                    binder.setLayer(uid, gid, data)
                        .then(model => {
                            const cmd = terminal.makeCommand({
                                args: [`cc /${uid}/${gid}/${model.id}`,'get'],
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
    const binder = ctx.binder;
    const stdout = ctx.sys.stdout;
    const stdin = ctx.sys.stdin;
    const terminal = ctx.shell.terminal;
    const extent = region.get();
    const center = extent.getCenter();

    const data = {
        user_id: uid,
        layer_id: lid,
        properties: {},
        geom: JSON.parse(center.format())
    };

    return binder.setFeature(uid, gid, lid, data)
        .then(model => {
            const cmd = terminal.makeCommand({
                args: [`cc /${uid}/${gid}/${lid}/${model.id}`],
                text: model.id
            });
            stdout.write('created feature ', cmd);
            resolve(model);
        })
        .catch(reject);
}

function iCreate () {
    const self = this;
    const terminal = self.shell.terminal;
    const stdout = self.sys.stdout;
    const stdin = self.sys.stdin;
    const current = self.current();

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

    let cType = 0;

    const resolver = (resolve, reject) => {
        terminal.input(stdin);
        stdin.read()
            .then(input => {
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


export default {
    name: 'ic',
    command: iCreate
};
