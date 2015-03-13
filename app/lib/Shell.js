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
    Bind = require('./Bind');


var SHELL = 0,
    USER = 1,
    GROUP = 2,
    LAYER = 3,
    FEATURE = 4;

function ShellError () {
    if(arguments.length > 0){
        console.error.apply(console, arguments);
    }
};

ShellError.prototype = Object.create(Error.prototype);


var Shell = O.extend({

    initialize: function (terminal) {
        this.contexts = new Array(5);
        this.contexts[SHELL] = new Root({shell:this});
        this.currentContext = SHELL;
        this.terminal = terminal;

        this.terminal.on('input', this.exec.bind(this));
    },

    exec: function (argv) {
        var self = this;
        try{
            var context = this.contexts[this.currentContext];
            return context.exec.apply(context, argv);
        }
        catch(err){
            return Promise.reject(err);
        }
    },

    clearContexts: function () {
        var start = this.currentContext + 1;
        for(var i = start; i < this.contexts.length; i++){
            this.contexts[i] = null;
        }
    },

    switchContext: function (pathComps) {
        if(0 === pathComps.length){
            this.currentContext = SHELL;
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
                self.contexts[USER] = new User({
                    shell:self, 
                    data:userData, 
                    parent:self.contexts[SHELL]
                });
                self.currentContext = USER;
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
            user = self.contexts[USER].data,
            bind = Bind.get();

        //console.log('shell.setGroup', groupId);
        var prm = bind.getGroup(user.id, groupId)
            .then(function(groupData){
                self.contexts[GROUP] = new Group({
                    shell:self, 
                    data:groupData, 
                    parent:self.contexts[USER]
                });
                self.currentContext = GROUP;
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
            user = self.contexts[USER].data,
            group = self.contexts[GROUP].data,
            bind = Bind.get();

        var prm = bind.getLayer(user.id, group.id, layerId)
            .then(function(layerData){
                self.contexts[LAYER] = new Layer({
                    shell:self, 
                    data:layerData, 
                    parent:self.contexts[GROUP]
                });
                self.currentContext = LAYER;
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
            user = self.contexts[USER].data,
            group = self.contexts[GROUP].data,
            layer = self.contexts[LAYER].data,
            bind = Bind.get();

        var prm = bind.getFeature(user.id, group.id, layer.id, featureId)
            .then(function(featureData){
                self.contexts[FEATURE] = new Feature({
                    shell:self, 
                    data:featureData, 
                    parent:self.contexts[LAYER]
                });
                self.currentContext = FEATURE;
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