/*
 * app/lib/commands/zoom.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */

import _ from 'underscore';

import region from '../Region';
import Transform from '../Transform';


function panRegion (dir, val) {
    const extent = region.get().extent;
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

    const NE = T.mapVec2([extent[2], extent[3]]);
    const SW = T.mapVec2([extent[0], extent[1]]);

    const newExtent = [SW[0], SW[1], NE[0], NE[1]];
    region.push(newExtent);
    return this.end(newExtent);
}

export default {
    name: 'pan',
    command: panRegion
};
