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
            var data = {
                user_id: uid,
                status_flag: (pp - 1),
                properties: {}
            }
            Bind.get()
                .setGroup(uid, data)
                .then(function(model){
                    var cmd = term.makeCommand({
                        cmd: 'cc',
                        args: [model.id],
                        text: 'move into group'
                    });
                    term.write(cmd);
                    resolve();
                })
                .catch(reject);
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
                if(cType !== 1){
                    return reject('Not Implemented');
                }
                createGroup(current[0], terminal, resolve, reject);
            });
    };

    return (new Promise(resolver));
};


module.exports = exports = {
    name: 'ic',
    command: iCreate
};