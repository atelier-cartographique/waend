/*
 * app/lib/commands/group/listFeatures.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */


var Promise = require("bluebird"),
helpers = require('../../helpers');

var getModelName = helpers.getModelName;

function listFeatures () {
    var self = this,
        current = self.current(),
        userId = current[0],
        groupId = current[1],
        layerId = current[2],
        shell = self.shell,
        stdout = self.sys.stdout,
        binder = self.binder,
        terminal = shell.terminal;

    var makeOutput = function (feature) {
        return terminal.makeCommand({
            fragment: feature.getDomFragment('name'),
            text: getModelName(feature),
            args: [
                'cc /' + userId + '/' + groupId + '/' + layerId + '/' +feature.id,
                'gg | region set',
                'get'
            ]
        });
    };


    var res = function(resolve, reject){
        binder.getFeatures(userId, groupId, layerId)
            .then(function(features){
                for(var i = 0; i < features.length; i++){
                    stdout.write(
                        makeOutput(features[i])
                    );
                }
                resolve();
            })
            .catch(reject);
    }
    return (new Promise(res));
};


module.exports = exports = {
    name: 'listFeatures',
    command: listFeatures
};
