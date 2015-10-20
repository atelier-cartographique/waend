/*
 * app/lib/commands/logout.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */


var Transport = require('../Transport'),
    Promise = require('bluebird'),
    config = require('../../../config');

function logout () {
    var self = this,
        transport = new Transport(),
        shell = self.shell;


    var resolver = function (resolve, reject) {
        transport.post(config.public.logoutUrl, {
            body: {}
        })
            .then(function(){
                shell.logoutUser();
                resolve();
            })
            .catch(reject);
    };

    return (new Promise(resolver));
}


module.exports = exports = {
    name: 'logout',
    command: logout
};
