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
    helpers = require('../../helpers'),
    region = require('../../Region');

var getModelName = helpers.getModelName,
    layerExtent = helpers.layerExtent;


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
        var fragment = document.createElement('div'),
            zoomer = document.createElement('div'),
            label = layer.getDomFragment('name');

        zoomer.setAttribute('class', 'll-zoomer icon-setmapextent');
        zoomer.innerHTML = '';
        zoomer.addEventListener('click', function () {
            layerExtent(layer)
                .then(_.bind(region.push, region))
                .catch(function(err){console.error(err)});
        }, false);

        label.addEventListener('click', function () {
            terminal.runCommand('cc /' + userId + '/' + groupId + '/' + layer.id);
        }, false);

        fragment.appendChild(zoomer);
        fragment.appendChild(label);
        return terminal.makeCommand({
            fragment: fragment,
            text: getModelName(layer)
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
