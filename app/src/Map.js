/*
 * app/src/Map.js
 *     
 * 
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 * 
 * License in LICENSE file at the root of the repository.
 *
 */

'use strict';


var _ = require('underscore'),
    ol = require('openlayers'),
    Geometry = require('../lib/Geometry'),
    semaphore = require('../lib/Semaphore'),
    Renderer = require('./Renderer');



function Map (options) {
    // better have a view that is prepared
    if(!('view' in options)){
        options.view = new ol.View({zoom: 0});
    }
    
    ol.Map.call(this, options);
    this.renderer_ = new Renderer(this.viewport_, this);

    // monitor viewport change in order to forward to the region
    var view = this.getView();
    view.on('change:center', this.waendUpdateRegion, this);
    view.on('change:resolution', this.waendUpdateRegion, this);
    view.on('change:rotation', this.waendUpdateRegion, this);

    // and listen to the region to update viewport
    semaphore.on('region:change', this.waendUpdateExtent, this);


    // listen to layer setup changes
    semaphore.on('layer:layer:add', this.waendAddLayer, this);
    semaphore.on('layer:layer:remove', this.waendRemoveLayer, this);

};

ol.inherits(Map, ol.Map);

Map.prototype.waendUpdateExtent = function (extent) {
    var view = this.getView();
    view.fitExtent(extent.extent, this.getSize());
};

Map.prototype.waendUpdateRegion = function () {
    var view = this.getView(),
        extent = view.calculateExtent(this.getSize());
    semaphore.signal('region:push', extent);
};


Map.prototype.waendAddLayer = function (layer) {
    this.addLayer(layer);
};

Map.prototype.waendRemoveLayer = function (layer) {
    this.removeLayer(layer);
};


module.exports = exports = Map;

