/*
 * app/lib/commands/getGeometry.js
 *     
 * 
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 * 
 * License in LICENSE file at the root of the repository.
 *
 */

'use strict';

var _ = require('underscore');

function getGeometry () {
    var self = this,
        args = _.toArray(arguments),
        format = args.shift(),
        sys = self.sys,
        geom = self.data.getGeometry();

    sys.stdout.write(geom.format(format));
    return self.end(geom);
};


module.exports = exports = {
    name: 'getGeometry',
    command: getGeometry
};