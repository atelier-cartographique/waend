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
    region = require('../Region');


function transformRegion (T, opt_extent) {
    var extent = opt_extent.extent;
    var NE = T.mapVec2([extent[2], extent[3]]);
    var SW = T.mapVec2([extent[0], extent[1]]);
    var newExtent = [SW[0], SW[1], NE[0], NE[1]];
    region.push(newExtent);
}

function select () {
    var self = this,
        stdout = self.sys.stdout,
        shell = self.shell,
        terminal = shell.terminal,
        map = shell.env.map,
        display = terminal.display();

    var resolver = function (resolve, reject) {
        var innerSelect = function (event) {
            var clientPos = [event.clientX, event.clientY],
                mapPos = map.getCoordinateFromPixel(clientPos),
                features = map.getFeaturesAt(mapPos);
            display.end();
            if (features) {
                // resolve(features[0]);
                for (var i =0 ; i < features.length; i++) {
                    var olf = features[i],
                        f = olf.feature,
                        id = f.id,
                        name = f.has('name') ? ' - ' + f.get('name') : '',
                        p = '/' + olf.getProperties().path.join('/');
                    stdout.write(terminal.makeCommand({
                        'args': [
                            'cc '+p,
                            'gg | region set',
                            'get'
                        ],
                        'text': (id + name)
                    }));
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
