/*
 * app/lib/commands/select.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */

// 'use strict';

var _ = require('underscore'),
    Promise = require('bluebird'),
    Geometry = require('../Geometry'),
    Transform = require('../Transform'),
    region = require('../Region'),
    helpers = require('../helpers');

var getModelName = helpers.getModelName;

function transformRegion (T, opt_extent) {
    var extent = opt_extent.extent;
    var NE = T.mapVec2([extent[2], extent[3]]);
    var SW = T.mapVec2([extent[0], extent[1]]);
    var newExtent = [SW[0], SW[1], NE[0], NE[1]];
    region.push(newExtent);
}


function getMouseEventPos (ev, view) {
    if (ev instanceof MouseEvent) {
        var target = ev.target,
            vrect = view.getRect();
            return [
                ev.clientX - vrect.left,
                ev.clientY - vrect.top
            ];
    }
    return [0, 0];
}


function select () {
    var self = this,
        stdout = self.sys.stdout,
        shell = self.shell,
        terminal = shell.terminal,
        map = shell.env.map,
        display = terminal.display();

    var makeOutput = function (feature) {
        return terminal.makeCommand({
            fragment: feature.getDomFragment('name'),
            text: getModelName(feature),
            args: [
                'cc /' + feature.getPath().join('/'),
                'gg | region set'
            ]
        });
    };


    var resolver = function (resolve, reject) {
        var innerSelect = function (event) {
            var pos = getMouseEventPos(event, map.getView()),
                clientPosMin = [pos[0] -1, pos[1] - 1],
                clientPosMax = [pos[0] + 1, pos[1] + 1],
                mapPosMin = map.getCoordinateFromPixel(clientPosMin),
                mapPosMax = map.getCoordinateFromPixel(clientPosMax),
                features = map.getFeatures(mapPosMin.concat(mapPosMax));
            display.end();
            if (features) {
                // resolve(features[0]);
                for (var i = 0 ; i < features.length; i++) {
                    var f = features[i];
                    if (f) {
                        stdout.write(makeOutput(f));
                    }
                }
                resolve(features);
            }
            else {
                reject('NothingSelected');
            }
        };
        display.node.addEventListener('click', innerSelect, true);
    };

    return (new Promise(resolver));
}


module.exports = exports = {
    name: 'select',
    command: select
};
