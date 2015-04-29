/*
 * app/lib/commands/chnageContext.js
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
    Bind = require("../Bind");

var dotdot = '..';
var dot = '.';

function cc (opt_path) {
    var path = ospath.normalize(opt_path),
        isAbsolute = ospath.isAbsolute ? ospath.isAbsolute(path) : '/' === path[0],
        pathComps = path.split('/'),
        ctxPath = [],
        shell = this.shell,
        terminal = this.shell.terminal,
        stdout = this.sys.stdout,
        stderr = this.sys.stderr;

    if(isAbsolute){
        if(path.length > 1){
            pathComps.shift();
            ctxPath = pathComps;
        }
    }
    else{
        var pathCompsRef = path.split('/');
        var current = this.current();
        for (var i = 0; i < pathCompsRef.length; i++) {
            var comp = pathCompsRef[i];
            if(dotdot === comp){
                current.pop();
                pathComps.shift();
            }
            else{
                break;
            }
        }
        ctxPath = current.concat(pathComps);
    }

    for (var i = ctxPath.length - 1; i >= 0; i--) {
        var match = Bind.get().matchKey(ctxPath[i]);
        if(match.length === 1){
            ctxPath[i] = match[0].id;
        }
        else{
            // if('me' !== ctxPath[i]){
            //     stderr.write('have '+ match.length +' match for '+ ctxPath[i]);
            // }
        }
    }

    var self = this;

    return this.shell.historyPushContext(ctxPath)
        .then(function(){
            // terminal.setTitle(title);
            return self.end(ctxPath);
        })
        .catch(function(err){
            return Promise.reject(err);
        });
}

module.exports = exports = {
    name: 'cc',
    command: cc
};
