/*
 * app/src/Layer.js
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
    ol = require('openlayers'),
    Geometry = require('../lib/Geometry'),
    semaphore = require('../lib/Semaphore');

'use strict';


var redCircle = new ol.style.Circle({
  radius: 4,
  fill: null,
  stroke: new ol.style.Stroke({color: 'red', width: 2})
});

var defaultPointStyle = [ new ol.style.Style({image: redCircle })];

function deafultStyle (feature, resolution) {
  return defaultPointStyle;
};


var MapLayer = O.extend({

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
        var layer = new ol.layer.Vector({
            'source': layerSource,
            'style:': deafultStyle
        });
        this.layers.push(layer);
        semaphore.signal('layer:layer:add', layer);
    },

    update: function (sources) {
        this.clearLayers();
        _.each(sources, function(source){
            this.addLayer(source);
        }, this);
    },


});


module.exports = exports = MapLayer;
