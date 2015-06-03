/*
 * app/lib/commands/feature/setGeometry.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */

// 'use strict';

var _ = require('underscore');

function setGeometry () {
    var self = this,
        feature = self.data,
        geom = self.shell.env.DELIVERED;


    return feature.setGeometry(geom);
    // sys.stdout.write(geom.format(format));
    // return self.end(feature);
}


module.exports = exports = {
    name: 'setGeometry',
    command: setGeometry
};
