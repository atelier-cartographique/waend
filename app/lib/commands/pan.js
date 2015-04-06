/*
 * app/lib/commands/zoom.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */

var _ = require('underscore'),
    region = require('../Region'),
    Transform = require('../Transform');


function panRegion (dir, val) {
    var extent = region.get().extent;
        T = new Transform();
    dir = dir.toUpperCase();
    if ('N' === dir){
        T.translate(0, val);
    }
    else if ('S' === dir){
        T.translate(0, -val);
    }
    else if ('E' === dir){
        T.translate(val, 0);
    }
    else if ('W' === dir){
        T.translate(-val, 0);
    }

    var NE = T.mapVec2([extent[2], extent[3]]);
    var SW = T.mapVec2([extent[0], extent[1]]);

    var newExtent = [SW[0], SW[1], NE[0], NE[1]];
    region.push(newExtent);
    return this.end(newExtent);
}

module.exports = exports = {
    name: 'pan',
    command: panRegion
};
