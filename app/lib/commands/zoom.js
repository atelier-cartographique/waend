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
    region = require('../Region');


function bufferRegion (arg) {
    var extent = region.get();

    var newExtent = extent.buffer(parseFloat(arg || 0));
    region.push(newExtent);
    return this.end(newExtent);
};

module.exports = exports = {
    name: 'zoom',
    command: bufferRegion
};