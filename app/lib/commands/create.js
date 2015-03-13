/*
 * app/lib/commands/setAttribute.js
 *     
 * 
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 * 
 * License in LICENSE file at the root of the repository.
 *
 */


var Promise = require('bluebird'),
    Bind = require('../Bind');


function createGroup (uid, term, resolve, reject) {
    term.write('1 : public');
    term.write('2 : private');

    term.read()
        .then(function(input){
            var pp = parseInt(input);
            if(!pp || pp > 2){
                return reject('Not a valid value');
            }
            term.write('enter a name');
            term.read()
                .then(function(name){
                    var data = {
                        user_id: uid,
                        status_flag: (pp - 1),
                        properties: {'name':name}
                    }
                    Bind.get()
                        .setGroup(uid, data)
                        .then(function(model){
                            var cmd = term.makeCommand({
                                args: ['cc', '/'+uid+'/'+model.id],
                                text: (model.get('name') || model.id)
                            });
                            term.write('move in group ', cmd);
                            resolve();
                        });
                });
        })
        .catch(reject);
};

function createLayer (uid, gid, term, resolve, reject) {
    term.write('enter a name');
    term.read()
        .then(function(name){
            var data = {
                user_id: uid,
                properties: {'name':name}
            }
            Bind.get()
                .setLayer(uid, gid, data)
                .then(function(model){
                    var cmd = term.makeCommand({
                        args: ['cc', '/'+uid+'/'+gid+'/'+model.id],
                        text: (model.get('name') || model.id)
                    });
                    term.write('move in layer ', cmd);
                    resolve();
                });
        })
        .catch(reject);
};

function iCreate () {

    var self = this,
        shell = self.shell,
        terminal = shell.terminal,
        current = self.current();
    
    terminal.write('select type:');
    if (1 === current.length) {
        terminal.write('1 : group');
    }
    else if (2 === current.length) {
        terminal.write('1 : group');
        terminal.write('2 : layer');
    }
    else if (3 === current.length) {
        terminal.write('1 : group');
        terminal.write('2 : layer');
        terminal.write('3 : feature');
    }

    var cType = 0;

    var resolver = function (resolve, reject) {
        terminal.read()
            .then(function(input){
                cType = parseInt(input);
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
                    createGroup(current[0], terminal, resolve, reject);
                }
                else if(2 === cType){
                    createLayer(current[0], current[1], terminal, resolve, reject);
                }
            });
    };

    return (new Promise(resolver));
};


module.exports = exports = {
    name: 'ic',
    command: iCreate
};