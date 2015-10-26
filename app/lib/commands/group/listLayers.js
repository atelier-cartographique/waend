/*
 * app/lib/commands/group/listLayers.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */


var _ = require('underscore'),
    Promise = require("bluebird"),
    helpers = require('../../helpers');

var getModelName = helpers.getModelName,
    addClass = helpers.addClass,
    emptyElement = helpers.emptyElement;


function listLayers () {
    var self = this,
        current = self.current(),
        userId = current[0],
        groupId = current[1],
        shell = self.shell,
        stdout = self.sys.stdout,
        binder = self.binder,
        terminal = shell.terminal;

    var makeOutput = function (layer) {
        var element = document.createElement('div');

        addClass(element, 'layer-name');

        element.appendChild(
            document.createTextNode(getModelName(layer))
        );

        var updater = function(changedKey, newValue) {
            if (element && ('name' === changedKey)) {
                emptyElement(element);
                element.appendChild(
                    document.createTextNode(getModelName(layer))
                )
            }
        };

        layer.on('set', updater);

        return terminal.makeCommand({
            fragment: element,
            text: getModelName(layer),
            args: [
                'cc /' + userId + '/' + groupId + '/' + layer.id,
                'get'
            ]
        });
    };


    var res = function(resolve, reject){
        binder.getLayers(userId, groupId)
            .then(function(layers){
                for(var i = 0; i < layers.length; i++){
                    stdout.write(
                        makeOutput(layers[i])
                    );
                }
                resolve(_.map(layers, function(l){return l.id;}));
            })
            .catch(reject);
    };
    return (new Promise(res));
}


module.exports = exports = {
    name: 'listLayers',
    command: listLayers
};
