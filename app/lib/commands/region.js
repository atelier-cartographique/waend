/*
 * app/lib/commands/region.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */

var _ = require('underscore'),
    util = require('util'),
    region = require('../Region');


function setRegion (east, south, west, north) {
    var self = this,
        env = self.shell.env,
        terminal = self.shell.terminal;

    var extent = [
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
    var r = region.get();
    return this.end(r.getArray());
}

function popRegion () {
    var r = region.pop();
    return this.end(r.getArray());
}

function getCenter () {
    var r = region.get(),
        center = r.getCenter().getCoordinates();
    this.sys.stdout.write(center[0], ' ', center[1]);
    return this.end(center);
}

function printRegion (opt_format) {
    var r = region.get(),
        NE = r.getTopRight().getCoordinates(),
        SW = r.getBottomLeft().getCoordinates(),
        f = '%d %d %d %d';

    this.sys.stdout.write(util.format(f, SW[0], SW[1], NE[0], NE[1]));
    return this.end(r.getArray());
}


function bufferRegion (arg) {
    var r = region.get();

    r.buffer(parseFloat(arg) || 0);
    region.push(r);
    return this.end(r.getArray());
}

function regionCommand () {
    var args = _.toArray(arguments),
        action = args.shift();

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

module.exports = exports = {
    name: 'region',
    command: regionCommand
};
