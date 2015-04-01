/*
 * app/lib/Semaphore.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */

'use strict';


var _ = require('underscore'),
    O = require('../../lib/object').Object;


var Semaphore = O.extend({

    signal: function () {
        var args = _.toArray(arguments);
        this.emit.apply(this, args);
    }
    
});

var semaphore = new Semaphore();
module.exports = exports = semaphore;
