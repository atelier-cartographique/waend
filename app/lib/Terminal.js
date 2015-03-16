/*
 * app/lib/Terminal.js
 *     
 * 
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 * 
 * License in LICENSE file at the root of the repository.
 *
 */

'use strict';

var O = require('../../lib/object').Object,
    Shell = require('../lib/Shell');


var Terminal = O.extend({


    capabilities: {},

    constructor: function () {
        this.shell = new Shell(this);
        O.apply(this, arguments);
    },

    getCapabilities: function () {
        return Object.keys(this.capabilities);
    },

    start: function () { throw (new Error('Not Implemented')); },
    makeCommand: function () { throw (new Error('Not Implemented')); },
    setTitle: function () { throw (new Error('Not Implemented')); }

});

module.exports = exports = Terminal;