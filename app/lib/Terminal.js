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


var argsRe = /'[^']*'|"[^"]*"|\S+/g ;


var Terminal = O.extend({


    capabilities: {},

    constructor: function () {
        this.shell = new Shell(this);
        O.apply(this, arguments);
    },

    getCapabilities: function () {
        return Object.keys(this.capabilities);
    },

    commandLineTokens: function (cl) {
        var args = cl.match(argsRe);
        if (!args) {
            args = [];
        };
        var cleanedArgs = [];
        for(var i = 0; i < args.length; i++){
            cleanedArgs.push(args[i].replace(/"/g,""));
        }
        return cleanedArgs;
    },

    start: function () { throw (new Error('Not Implemented')); },
    write: function () { throw (new Error('Not Implemented')); },
    makeCommand: function () { throw (new Error('Not Implemented')); },
    setTitle: function () { throw (new Error('Not Implemented')); }

});

module.exports = exports = Terminal;