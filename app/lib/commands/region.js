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
    terminal.write(region.get());
    return self.end();
};


function getRegion () {
    var self = this,
        terminal = self.shell.terminal;

    terminal.write(region.get());
    return self.end();
};

function popRegion () {
    var self = this,
        terminal = self.shell.terminal;

    terminal.write(region.pop());
    return self.end();
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
    return this.endWithError('not a valid action');
};

module.exports = exports = {
    name: 'r',
    command: regionCommand
};