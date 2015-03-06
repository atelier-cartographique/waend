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
    Root = require('./Root'),
    Group = require('./Group'),
    Layer = require('./Layer'),
    Feature = require('./Feature'),
    Bind = require('./Bind');


var SHELL = 0,
    GROUP = 1,
    LAYER = 2,
    FEATURE = 3;

var Shell = O.extend({

    initialize: function (terminal) {
        this.contexts = new Array(4);
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
            this.loadGroup(pathComps);
        }
        else if(2 === pathComps.length){
            this.loadLayer(pathComps);
        }
        else if(3 === pathComps.length){
            this.loadFeature(pathComps);
        }
    },

    loadGroup: function (path) {
        var groupName = path[0],
            bind = Bind.get(),
            groupData = bind.create('group', groupName);

        this.contexts[GROUP] = new Group({shell:this, data:groupData});
        this.currentContext = GROUP;
        this.clearContext();
    },

    loadLayer: function (path) {
        var groupName = path[0],
            layerName = path[1],
            bind = Bind.get(),
            groupData = bind.create('group', groupName),
            layerData = bind.create('layer', layerName);

        this.contexts[GROUP] = new Group({shell:this, data:groupData});
        this.contexts[LAYER] = new Layer({shell:this, data:layerData});
        this.currentContext = LAYER;
        this.clearContext();
    },

    loadFeature: function (path) {
        var groupName = path[0],
            layerName = path[1],
            featureName = path[2],
            bind = Bind.get(),
            groupData = bind.create('group', groupName),
            layerData = bind.create('layer', layerName),
            featureData = bind.create('feature', featureName);

        this.contexts[GROUP] = new Group({shell:this, data:groupData});
        this.contexts[LAYER] = new Layer({shell:this, data:layerData});
        this.contexts[FEATURE] = new Feature({shell:this, data:featureData});
        this.currentContext = FEATURE;
        this.clearContext();
    },

});


module.exports = exports = Shell;