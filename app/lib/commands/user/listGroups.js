/*
 * app/lib/commands/user/listGroups.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */


var Promise = require("bluebird"),
    helpers = require('../../helpers');

var getModelName = helpers.getModelName,
    addClass = helpers.addClass,
    emptyElement = helpers.emptyElement;

function listGroups () {
    var self = this,
        userId = self.data.id,
        shell = self.shell,
        stdout = self.sys.stdout,
        binder = self.binder,
        terminal = self.shell.terminal;

    var makeOutput = function (group) {
        return terminal.makeCommand({
            fragment: group.getDomFragment('name'),
            text: getModelName(group),
            args: [
                'cc /' + userId + '/' + group.id,
                'get'
            ]
        });
    };

    var res = function(resolve, reject){
        binder.getGroups(userId)
            .then(function(groups){
                for(var i = 0; i < groups.length; i++){
                    stdout.write(
                        makeOutput(groups[i])
                    );
                }
                resolve();
            })
            .catch(reject);
    }
    return (new Promise(res));
};


module.exports = exports = {
    name: 'listGroups',
    command: listGroups
};
