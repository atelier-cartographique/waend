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
    Bind = require('./Bind'),
    commands = require('./commands');


var Context = O.extend({


    commands: {},

    constructor: function (options) {
        this.shell = options.shell;
        this.data = options.data;
        this.parent = options.parent;
        this._current = this._computeCurrent();
        O.apply(this, arguments);
        _.defaults(this.commands, commands);
    },

    _computeCurrent: function (ctx, memo) {
        //console.log('context.current', ctx, memo);
        if(!ctx){
            ctx = this;
            memo = [];
        }
        if(ctx.parent){
            this._computeCurrent(ctx.parent, memo);
        }
        if(ctx.data){
            memo.push(ctx.data.id);
        }
        return memo;
    },

    /**
     *  this function executes a command in the scope of this context
     */
    exec: function () {
        var args =  _.toArray(arguments),
            sys = args.shift(),
            cmd = args.shift();

        if(!(cmd in this.commands)){
            if (this.parent) {
                return this.parent.exec.apply(this.parent, arguments);
            }
            throw (new Error("command not found: "+cmd));
        }

        this.sys = sys;
        this.binder = Bind.get();

        var ret = this.commands[cmd].apply(this, args);
        return ret;
    },

    current: function () {
        return this._current;
    },

    getUser: function () {
        var cur = this.current();
        if (cur.length > 0) {
            return cur[0];
        }
        return null;
    },

    getGroup: function () {
        var cur = this.current();
        if (cur.length > 1) {
            return cur[1];
        }
        return null;
    },

    getLayer: function () {
        var cur = this.current();
        if (cur.length > 2) {
            return cur[2];
        }
        return null;
    },

    getFeature: function () {
        var cur = this.current();
        if (cur.length > 3) {
            return cur[3];
        }
        return null;
    },


    end: function (ret) {
        if (_.isFunction(ret)) { // we assume fn(resolve, reject)
            return (new Promise(ret));
        }
        return Promise.resolve(ret);
    },

    endWithError: function (err) {
        return Promise.reject(err);
    }

});


module.exports = exports = Context;
