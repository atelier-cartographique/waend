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
    O = require('../../lib/object').Object;



var dotdot = '..';
var dot = '.';



/**
 * change context (cc) shall be available in all contexts
 * it will be injected in the base context constructor
 *
 * this will be executed in the context of Context :)
 */

var titleTypes = ['shell', 'user', 'group', 'layer', 'feature'];


function changeContext (path) {
    var pathCompsRef = ospath.normalize(path).split('/');
    var pathComps = ospath.normalize(path).split('/');
    if(pathComps.length > 0 && pathComps[0].length < 1){
        pathCompsRef.shift();
        pathComps.shift();
    }
    var current = this.current();
    console.log('changeContext', pathCompsRef, current);
    for (var i = 0; i < pathCompsRef.length; i++) {
        var comp = pathCompsRef[i];
        if(dotdot === comp){
            current.pop();
            pathComps.shift();
        }
        else{
            break;
        }
    };

    var terminal = this.shell.terminal;
    var self = this;
    var ctxPath = current.concat(pathComps);
    var titleType = titleTypes[ctxPath.length];
    var title = '['+ titleType + ']';
    return this.shell.switchContext(ctxPath)
        .then(function(){
            terminal.setTitle(title);
            return self.conclusion();
        });
};

function printCurrentContext () {
    var terminal = this.shell.terminal;
    var current = this.current();
    terminal.write('/' + current.join('/'));
    return this.conclusion();
};

var Context = O.extend({

    constructor: function (options) {
        this.shell = options.shell;
        this.data = options.data;
        this.parent = options.parent;
        O.apply(this, arguments);

        this.commands['cc'] = changeContext;
        this.commands['pwd'] = printCurrentContext;

        console.log('New Context:', this.name);
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

        return this.commands[cmd].apply(this, args);
    },

    current: function (ctx, memo) {
        console.log('context.current', ctx, memo);
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


    conclusion: function (ret) {
        return Promise.resolve(0, ret);
    }

});


module.exports = exports = Context;