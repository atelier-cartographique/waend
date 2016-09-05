/*
 * app/lib/commands/region.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */

import _ from 'underscore';

import util from 'util';
import region from '../Region';


function setRegion (east, south, west, north) {
    const self = this;
    const env = self.shell.env;
    const terminal = self.shell.terminal;

    let extent = [
        parseFloat(west),
        parseFloat(south),
        parseFloat(east),
        parseFloat(north)
    ];

    if ((0 === arguments.length)
        && env.DELIVERED
        && env.DELIVERED.getExtent) {
            extent = env.DELIVERED.getExtent();
    }

    region.push(extent);
    return self.end(region.get().getArray());
}


function getRegion () {
    const r = region.get();
    return this.end(r.getArray());
}

function popRegion () {
    const r = region.pop();
    return this.end(r.getArray());
}

function getCenter () {
    const r = region.get();
    const center = r.getCenter().getCoordinates();
    this.sys.stdout.write(center[0], ' ', center[1]);
    return this.end(center);
}

function printRegion (opt_format) {
    const r = region.get();
    const NE = r.getTopRight().getCoordinates();
    const SW = r.getBottomLeft().getCoordinates();
    const f = '%d %d %d %d';

    this.sys.stdout.write(util.format(f, SW[0], SW[1], NE[0], NE[1]));
    return this.end(r.getArray());
}


function bufferRegion (arg) {
    const r = region.get();

    r.buffer(parseFloat(arg) || 0);
    region.push(r);
    return this.end(r.getArray());
}

function regionCommand () {
    const args = _.toArray(arguments);
    const action = args.shift();

    if('set' === action){
        return setRegion.apply(this, args);
    }
    else if('get' === action){
        return getRegion.apply(this, args);
    }
    else if('pop' === action){
        return popRegion.apply(this, args);
    }
    else if('center' === action){
        return getCenter.apply(this, args);
    }
    else if('buffer' === action){
        return bufferRegion.apply(this, args);
    }
    else if('print' === action){
        return printRegion.apply(this, args);
    }
    return this.endWithError('not a valid action');
}

export default {
    name: 'region',
    command: regionCommand
};
