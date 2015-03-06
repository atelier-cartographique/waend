/*
 * app/lib/Context.js
 *     
 * 
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 * 
 * License in LICENSE file at the root of the repository.
 *
 */


var _ = require('underscore'),
    O = require('../../lib/object').Object;



var Context = O.extend({

    constructor: function (options) {
        this.shell = options.shell;
        O.apply(this, arguments);
    },

    /**
     *  this function executes a command in the scope of this context
     *
     *
     */
    exec: function () {
        var args =  _.toArray(arguments),
            cmd = args.shift();

        if(!(cmd in this.commands)){
            throw (new Error("command not found: "+cmd));
        }

        this.commands[cmd].apply(this, args);
    }

});


module.exports = exports = Context;