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
    ospath = require('path'),
    Promise = require("bluebird"),
    O = require('../../lib/object').Object,
    commands = require('./commands');


var Context = O.extend({


    commands: {},

    constructor: function (options) {
        this.shell = options.shell;
        this.data = options.data;
        this.parent = options.parent;
        O.apply(this, arguments);

        _.defaults(this.commands, commands);
    },

    /**
     *  this function executes a command in the scope of this context
     */
    exec: function () {
        var args =  _.toArray(arguments),
            cmd = args.shift();

        if(!(cmd in this.commands)){
            throw (new Error("command not found: "+cmd));
        }

        var ret = this.commands[cmd].apply(this, args);
        return ret;
    },

    current: function (ctx, memo) {
        //console.log('context.current', ctx, memo);
        if(!ctx){
            ctx = this;
            memo = [];
        }
        if(ctx.parent){
            this.current(ctx.parent, memo);
        }
        if(ctx.data){
            memo.push(ctx.data.id);
        }
        return memo;
    },


    end: function (ret) {
        return Promise.resolve(ret);
    },

    endWithError: function (err) {
        return Promise.reject(err);
    }

});


module.exports = exports = Context;