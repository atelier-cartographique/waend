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
    region = require('../Region');


function setRegion (north, east, south, west) {
    var self = this,
        terminal = self.shell.terminal;

    var extent = [
        parseFloat(east), 
        parseFloat(south), 
        parseFloat(west), 
        parseFloat(north)
    ];

    region.push(extent);
    return self.end(region.get());
};


function getRegion () {
    var r = this.sys.stdout.write(region.get());
    return this.end(r);
};

function popRegion () {
    var r = region.pop();
    return this.end(r);
};

function getCenter (opt_format) {
    var r = region.get(),
        format = opt_format || 'WKT',
        center = r.getCenterFormat(format);
    return this.end(center);
};

function printRegion (opt_format) {
    var r = region.get(),
        NE = r.getTopRight().getCoordinates(),
        SW = r.getBottomLeft().getCoordinates();
    this.sys.stdout.write('North ', NE[1]);
    this.sys.stdout.write('East ', NE[0]);
    this.sys.stdout.write('South ', SW[1]);
    this.sys.stdout.write('West ', SW[0]);
    return this.end();
};

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
    else if('print' === action){
        return printRegion.apply(this, args);
    }
    return this.endWithError('not a valid action');
};

module.exports = exports = {
    name: 'r',
    command: regionCommand
};