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

var Shell = O.extend({

    initialize: function (terminal) {
        this.contexts = new Array(5);
        this.contexts[SHELL] = new Root({shell:this});
        this.currentContext = SHELL;
        this.terminal = terminal;

        this.terminal.on('input', this.exec.bind(this));
    },

    exec: function (argv) {
        try{
            this.contexts[this.currentContext].exec(argv);
        }
        catch(err){
            this.emit('error', err);
        }
    },

    clearContexts: function () {
        var start = this.currentContext + 1;
        for(var i = start; i < this.contexts.length; i++){
            this.contexts[i] = null;
        }
    },

    switchContext: function (path) {
        var pathComps = path.split('/');
        if(0 === pathComps.length){
            this.currentContext = SHELL;
            this.clearContexts();
        }
        else if(1 === pathComps.length){
            this.loadUser(pathComps);
        }
        else if(2 === pathComps.length){
            this.loadGroup(pathComps);
        }
        else if(3 === pathComps.length){
            this.loadLayer(pathComps);
        }
        else if(4 === pathComps.length){
            this.loadFeature(pathComps);
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

    loadUser: function (path) {
        var userName = this.getUserId(path[0]),
            bind = Bind.get(),
            userData = bind.create('user', userName);

        this.contexts[USER] = new User({shell:this, data:userData});
        this.currentContext = USER;
        this.clearContext();
    },

    loadGroup: function (path) {
        var userName = this.getUserId(path[0]),
            groupName = path[1],
            bind = Bind.get(),
            userData = bind.create('user', userName),
            groupData = bind.create('group', groupName);

        this.contexts[USER] = new User({shell:this, data:userData});
        this.contexts[GROUP] = new Group({shell:this, data:groupData});
        this.currentContext = GROUP;
        this.clearContext();
    },

    loadLayer: function (path) {
        var userName = this.getUserId(path[0]),
            groupName = path[1],
            layerName = path[2],
            bind = Bind.get(),
            userData = bind.create('user', userName),
            groupData = bind.create('group', groupName),
            layerData = bind.create('layer', layerName);

        this.contexts[USER] = new User({shell:this, data:userData});
        this.contexts[GROUP] = new Group({shell:this, data:groupData});
        this.contexts[LAYER] = new Layer({shell:this, data:layerData});
        this.currentContext = LAYER;
        this.clearContext();
    },

    loadFeature: function (path) {
        var userName = this.getUserId(path[0]),
            groupName = path[1],
            layerName = path[2],
            featureName = path[3],
            bind = Bind.get(),
            userData = bind.create('user', userName),
            groupData = bind.create('group', groupName),
            layerData = bind.create('layer', layerName),
            featureData = bind.create('feature', featureName);

        this.contexts[USER] = new User({shell:this, data:userData});
        this.contexts[GROUP] = new Group({shell:this, data:groupData});
        this.contexts[LAYER] = new Layer({shell:this, data:layerData});
        this.contexts[FEATURE] = new Feature({shell:this, data:featureData});
        this.currentContext = FEATURE;
        this.clearContext();
    },

});


module.exports = exports = Shell;