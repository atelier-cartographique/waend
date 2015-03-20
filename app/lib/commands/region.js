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
        parseFloat(west), 
        parseFloat(south), 
        parseFloat(east), 
        parseFloat(north)
    ];

    region.push(extent);
    return self.end(region.get());
};


function getRegion () {
    var r = region.get();
    this.sys.stdout.write(r);
    return this.end(r);
};

function popRegion () {
    var r = region.pop();
    return this.end(r);
};

function getCenter (opt_format) {
    var r = region.get(),
        format = opt_format || 'WKT',
        center = r.getCenter();
    if(opt_format){
        this.sys.stdout.write(center.format(format));
    }
    return this.end(center);
};

function printRegion (opt_format) {
    var r = region.get(),
        NW = r.getTopLeft().format('WKT'),
        SE = r.getBottomRight().format('WKT');
    this.sys.stdout.write('NorthWest ', NW);
    this.sys.stdout.write('SouthEast ', SE);
    // this.sys.stdout.write('South ', SW[1]);
    // this.sys.stdout.write('West ', SW[0]);
    return this.end();
};


function bufferRegion (arg) {
    var r = region.get();

    r.buffer(arg || 0);
    region.set(r);
    return this.end(r);
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
    else if('buffer' === action){
        return bufferRegion.apply(this, args);
    }
    else if('print' === action){
        return printRegion.apply(this, args);
    }
    return this.endWithError('not a valid action');
};

module.exports = exports = {
    name: 'region',
    command: regionCommand
};