/*
 * app/src/Source.js
 *     
 * 
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 * 
 * License in LICENSE file at the root of the repository.
 *
 */

'use strict';


var _ = require('underscore'),
    Promise = require('bluebird'),
    ol = require('openlayers'),
    region = require('../lib/Region'),
    Geometry = require('../lib/Geometry'),
    semaphore = require('../lib/Semaphore'),
    Bind = require('../lib/Bind');

'use strict';

var binder = Bind.get();


// declarations
function Source () {
    var self = this;
    self.layerSources = [];

    semaphore.on('shell:change:context', function(ctxIndex, path){
        if (ctxIndex > 1) {
            self.updateGroup(path[0], path[1]);
        }
    });

};

function LayerSource (uid, gid, layer) {
    var options = {
        'projection': 'EPSG:4326'
    }
    ol.source.GeoJSON.call(this, options);
    this.uid = uid;
    this.gid = gid;
    this.layer = layer;

    // listen to the layer to update features if some are created
    layer.on('change', this.update, this);
    console.log('LayerSource listen to layer', layer.id);
    // listen to the region
    semaphore.on('region:change', this.update, this);
};
ol.inherits(LayerSource, ol.source.GeoJSON);

// implementations
Source.prototype.updateGroup = function(userId, groupId) {
    var self = this;
    if (self.groupId === groupId) {
        return;
    }
    self.userId = userId;
    self.groupId = groupId;
    self.loadLayers()
        .then(function(){
            self.updateLayers();
            semaphore.signal('source:change', self.getSources());
        })
        .catch(console.error.bind(console));
};


Source.prototype.clearLayers = function () {
    _.each(this.layerSources, function(layer){
        layer.clear();
    }, this);
    this.layerSources = [];
};


Source.prototype.updateLayers = function () {
    _.each(this.layerSources, function(layer){
        layer.update();
    }, this);
};


Source.prototype.loadLayers = function () {
    var self = this;
    return binder
        .getLayers(self.userId, self.groupId)
        .then(function(layers){
            self.clearLayers();
            for (var lidx = 0; lidx < layers.length; lidx++) {
                self.layerSources.push(new LayerSource(self.userId, self.groupId, layers[lidx]));
            }
            return Promise.resolve();
        })
        .catch(console.error.bind(console));
};

Source.prototype.getSources = function () {
    return this.layerSources;
};


LayerSource.prototype.buildFeature = function (f) {
    var geom = f.getGeometry(),
        feature = new ol.Feature({
            geometry: f.getGeometry(),
            id: f.id,
            path: [this.uid, this.gid, this.layer.id, f.id]
        });

    return feature;
};

LayerSource.prototype.update = function () {
    var self = this;
    binder.getFeatures(self.uid, self.gid, self.layer.id)
        .then(function(features){
            for (var i = 0; i < features.length; i++) {
                var feature = features[i];
                var featureIsNew = !(self.getFeatureById(feature.id));
                if(featureIsNew){
                    var f = self.buildFeature(feature)
                    self.addFeature(f);
                }
            }
        })
        .catch(console.error.bind(console));
};


module.exports = exports = Source;
