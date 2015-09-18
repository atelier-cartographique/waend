/*
 * app/src/LayerProvider.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */

'use strict';


var _ = require('underscore'),
    O = require('../../lib/object').Object,
    Geometry = require('../lib/Geometry'),
    semaphore = require('../lib/Semaphore'),
    waendLayerProgram = require('./Program');



var LayerProvider = O.extend({

    initialize: function () {
        this.layers = [];
        semaphore.on('source:change', this.update, this);
    },

    clearLayers: function () {
        _.each(this.layers, function(layer){
            semaphore.signal('layer:layer:remove', layer);
        }, this);
        this.layers = [];
    },

    addLayer: function (layerSource) {
        var programSrc = layerSource.layer.get('program'),
            program;
        if (programSrc) {
            program = new Function('ctx', programSrc);
        }
        else {
            program = waendLayerProgram;
        }
        layerSource.getProgram = function () {
            return program;
        };
        this.layers.push(layerSource);
        semaphore.signal('layer:layer:add', layerSource);
    },

    update: function (sources) {
        semaphore.signal('layer:update:start', this);
        this.clearLayers();
        _.each(sources, function(source){
            this.addLayer(source);
        }, this);
        semaphore.signal('layer:update:complete', this);
    },


});


module.exports = exports = LayerProvider;
