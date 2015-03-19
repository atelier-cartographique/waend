/*
 * app/lib/Shell.js
 *     
 * 
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 * 
 * License in LICENSE file at the root of the repository.
 *
 */


var O = require('../../lib/object').Object,
    _ = require('underscore'),
    Promise = require("bluebird"),
    Context = require('./Context'),
    User = require('./User'),
    Root = require('./Root'),
    Group = require('./Group'),
    Layer = require('./Layer'),
    Feature = require('./Feature'),
    Bind = require('./Bind'),
    Stream = require('./Stream'),
    region = require('./Region'),
    semaphore = require('./Semaphore');


var SHELL = 0,
    USER = 1,
    GROUP = 2,
    LAYER = 3,
    FEATURE = 4;



function getCliChunk (chars, start, endChar) {
    var chunk = '';
    for (var i = start; i < chars.length; i++) {
        var c = chars[i];
        if(endChar === c){
            break;
        }
        chunk += c;
    };
    return chunk;
};

function cliSplit (str) {
    var chars = str.trim().split(''),
        ret = [];
    for (var i = 0; i < chars.length; i++) {
        var c = chars[i];
        if ('"' === c) {
            var chunk = getCliChunk(chars, i + 1, '"');
            i += chunk.length + 1;
            ret.push(chunk);
        }
        else if ("'" === c) {
            var chunk = getCliChunk(chars, i + 1, "'");
            i += chunk.length + 1;
            ret.push(chunk);
        }
        else if (' ' !== c) {
            var chunk = getCliChunk(chars, i, ' ');
            i += chunk.length;
            ret.push(chunk);
        }
    }

    return ret;
};

// some tests, i keep them around for whatever reason
// var tests = [
//     ['cmd arg', 2],
//     ['cmd arg0 arg1', 3],
//     ['cmd "arg0 arg1"', 2],
//     ['cmd \'"arg0 arg1" arg2\' arg3', 3],
//     ['cmd "\'arg0 arg1 arg2\' arg3" arg4', 3],
//     ['cmd "\'arg0 arg1 arg2\' arg3" "arg4 arg5"', 3],
// ];

// for (var i = 0; i < tests.length; i++) {
//     var str = tests[i][0];
//     var check = tests[i][1];
//     var splitted = split(str)
//     console.log('<'+str+'>', check, splitted.length, splitted);
// }

function ShellError () {
    if(arguments.length > 0){
        console.error.apply(console, arguments);
    }
};

ShellError.prototype = Object.create(Error.prototype);

var defaultDescriptor = {
    enumerable: false,
    configurable: false,
    // writable: false
};

var Shell = O.extend({

    initialize: function (terminal) {
        this._contexts = new Array(5);
        this._contexts[SHELL] = new Root({shell:this});
        this._currentContext = SHELL;
        this.initStreams();

        this.env = {};
        this.terminal = terminal;
    },

    initStreams: function () {
        
        var streams = {
            stdin: new Stream(),
            stdout: new Stream(),
            stderr: new Stream()
        };

        Object.defineProperty(this, 'stdin', _.defaults({
            get: function(){
                return streams.stdin;
            },
        }, defaultDescriptor));
        
        Object.defineProperty(this, 'stdout', _.defaults({
            get: function(){
                return streams.stdout;
            },
        }, defaultDescriptor));
        
        Object.defineProperty(this, 'stderr', _.defaults({
            get: function(){
                return streams.stderr;
            },
        }, defaultDescriptor));
        
        this._streams = streams;

    },

    commandLineTokens: function (cl) {
        return cliSplit(cl);
    },


    makePipes: function (n) {
        var pipes = new Array();

        for (var i = 0; i < n; i++) {
            var sys = {
                'stdin': (new Stream()),
                'stdout': (new Stream()),
                'stderr': (new Stream())
            };
            pipes.push(sys);
        }
        pipes.push({
                'stdin': this.stdin,
                'stdout': this.stdout,
                'stderr': this.stderr
            });
        return pipes;
    },

    execOne: function (cl) {
        var self = this,
            toks = this.commandLineTokens(cl.trim()),
            context = this._contexts[this._currentContext];

        try {
            var sys = {
                'stdin': this.stdin,
                'stdout': this.stdout,
                'stderr': this.stderr
            };
            var args = [sys].concat(toks);
            return context.exec
                .apply(context, args)
                .then(function(result){
                    self.env.DELIVERED = result;
                    return Promise.resolve(result);
                });
        }
        catch (err) {
            self.env.DELIVERED = err;
            return Promise.reject(err);
        }
    },

    execMany: function (cls) {
        var self = this,
            context = this._contexts[this._currentContext],
            pipes = this.makePipes(cls.length);

        var pipeStreams = function(s, t) {
            _.each(s, function(sourceStream, name){
                var targetStream = t[name];
                sourceStream.on('data', function(){
                    targetStream.write.apply(targetStream, arguments);
                });
            });
        };

        return Promise.reduce(cls, function(total, item, index) {
            self.env.DELIVERED = total;
            var cl = cls[index].trim(),
                toks = self.commandLineTokens(cl),
                args = [pipes[index]].concat(toks);
            if(index > 0){
                _.each(['stdin', 'stdout', 'stderr'], function(name){
                    pipes[index - 1][name].close();
                });
            }
            pipeStreams(pipes[index], pipes[index + 1]);
            return context.exec.apply(context, args);
        }, 0);
    },

    exec: function (cl) {
        var cls = cl.trim().split('|');
        // shall be called, but not doing it exposes weaknesses, which is good at this stage
        // this.stdin.dump();
        // this.stdout.dump();
        // this.stderr.dump();

        if(1 == cls.length){
            return this.execOne(cls[0]);
        }
        return this.execMany(cls);
    },

    clearContexts: function () {
        var start = this._currentContext + 1;
        for(var i = start; i < this._contexts.length; i++){
            this._contexts[i] = null;
        }
        var path = [];
        for(var i = 1; i < start; i++){
            path.push(this._contexts[i].data.id);
        }
        semaphore.signal('shell:change:context', this._currentContext, path);
    },

    switchContext: function (pathComps) {
        if(0 === pathComps.length){
            this._currentContext = SHELL;
            this.clearContexts();
            return Promise.resolve(0, 'shell');
        }
        else if(1 === pathComps.length){
            return this.loadUser(pathComps);
        }
        else if(2 === pathComps.length){
            return this.loadGroup(pathComps);
        }
        else if(3 === pathComps.length){
            return this.loadLayer(pathComps);
        }
        else if(4 === pathComps.length){
            return this.loadFeature(pathComps);
        }
    },

    getUserId: function (userName) {
        if('me' === userName){
            if(this.user){
                return this.user.id;
            }
            throw (new Error("you're not logged in"));
        }
        return userName;
    },

    setUser: function (userId) {
        //console.log('shell.setUser', userId);
        var self = this,
            bind = Bind.get();

        var prm = bind.getUser(userId)
            .then(function(userData){
                self._contexts[USER] = new User({
                    shell:self, 
                    data:userData, 
                    parent:self._contexts[SHELL]
                });
                self._currentContext = USER;
                self.clearContexts();
                return Promise.resolve(self);
            })
            .catch(function(err){
                console.error('failed to switch context', err);
            });

        return prm;
    },

    setGroup: function (groupId) {
        var self = this,
            user = self._contexts[USER].data,
            bind = Bind.get();

        //console.log('shell.setGroup', groupId);
        var prm = bind.getGroup(user.id, groupId)
            .then(function(groupData){
                self._contexts[GROUP] = new Group({
                    shell:self, 
                    data:groupData, 
                    parent:self._contexts[USER]
                });
                self._currentContext = GROUP;
                self.clearContexts();
                return Promise.resolve(self);
            })
            .catch(function(err){
                console.error('failed to switch context', err);
            });
            
        return prm;
    },

    setLayer: function (layerId) {
        //console.log('shell.setLayer', layerId);
        var self = this,
            user = self._contexts[USER].data,
            group = self._contexts[GROUP].data,
            bind = Bind.get();

        var prm = bind.getLayer(user.id, group.id, layerId)
            .then(function(layerData){
                self._contexts[LAYER] = new Layer({
                    shell:self, 
                    data:layerData, 
                    parent:self._contexts[GROUP]
                });
                self._currentContext = LAYER;
                self.clearContexts();
                return Promise.resolve(self);
            })
            .catch(function(err){
                console.error('failed to switch context', err);
            });
            
        return prm;
    },

    setFeature: function (featureId) {
        //console.log('shell.setFeature', featureId);
        var self = this,
            user = self._contexts[USER].data,
            group = self._contexts[GROUP].data,
            layer = self._contexts[LAYER].data,
            bind = Bind.get();

        var prm = bind.getFeature(user.id, group.id, layer.id, featureId)
            .then(function(featureData){
                self._contexts[FEATURE] = new Feature({
                    shell:self, 
                    data:featureData, 
                    parent:self._contexts[LAYER]
                });
                self._currentContext = FEATURE;
                self.clearContexts();
                return Promise.resolve(self);
            })
            .catch(function(err){
                console.error('failed to switch context', err);
            });
            
        return prm;
    },

    loadUser: function (path) {
        //console.log('shell.loadUser', path);
        var userName = this.getUserId(path[0]);
        
        return this.setUser(userName);
    },

    loadGroup: function (path) {
        //console.log('shell.loadGroup', path);
        var self = this,
            userName = this.getUserId(path[0]),
            groupName = path[1],
            getGroup = _.bind(_.partial(self.setGroup, groupName), self);

        return self.setUser(userName)
            .then(getGroup);
    },

    loadLayer: function (path) {
        //console.log('shell.loadLayer', path);
        var self = this,
            userName = this.getUserId(path[0]),
            groupName = path[1],
            layerName = path[2],
            getGroup = _.bind(_.partial(self.setGroup, groupName), self),
            getLayer = _.bind(_.partial(self.setLayer, layerName), self);

        return this.setUser(userName)
            .then(getGroup)
            .then(getLayer);
    },

    loadFeature: function (path) {
        //console.log('shell.loadFeature', path);
        var self = this,
            userName = this.getUserId(path[0]),
            groupName = path[1],
            layerName = path[2],
            featureName = path[3],
            getGroup = _.bind(_.partial(self.setGroup, groupName), self),
            getLayer = _.bind(_.partial(self.setLayer, layerName), self),
            getFeature = _.bind(_.partial(self.setFeature, featureName), self);
        
        return this.setUser(userName)
            .then(getGroup)
            .then(getLayer)
            .then(getFeature);
    },

});


module.exports = exports = Shell;