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
    Renderer = require('./Renderer'),
    Queue = require('../lib/Queue');



function Map (options) {
    // better have a view that is prepared
    if(!('view' in options)){
        options.view = new ol.View({
            zoom: 0,
            center: [0,0],
            projection: 'EPSG:4326'
        });
    }
    
    ol.Map.call(this, options);
    this.renderer_ = new Renderer(this.viewport_, this);

    // listen to layer setup changes
    semaphore.on('layer:layer:add', this.waendAddLayer, this);
    semaphore.on('layer:layer:remove', this.waendRemoveLayer, this);

    this.updateQueue = new Queue();
    this.listenToWaend();
};

ol.inherits(Map, ol.Map);

Map.prototype.listenToWaend = function () {
    this.onChangeViewKey = this.on('moveend', this.waendUpdateRegion, this);
    this.onChangeRegionKey = semaphore.on('region:change', this.waendUpdateExtent, this);
};

Map.prototype.unlistenToWaend = function () {
    this.unByKey(this.onChangeViewKey);
    semaphore.off(this.onChangeRegionKey);
};

Map.prototype.wrapViewUpdate = function () {
    var args = _.toArray(arguments),
        fn = args.shift(),
        ctx = args.shift();

    this.updateQueue
        .push(this.unlistenToWaend, this)
        .push(fn, ctx, args)
        .push(this.listenToWaend, this);
};

Map.prototype.waendUpdateExtent = function (extent) {
    var view = this.getView();
    // view.fitExtent(extent.extent, this.getSize());
    this.wrapViewUpdate(view.fitExtent, view, extent.extent, this.getSize());
};

Map.prototype.waendUpdateRegion = function () {
    var view = this.getView(),
        extent = view.calculateExtent(this.getSize());
    // semaphore.signal('region:push', extent);
    this.wrapViewUpdate(semaphore.signal, semaphore, 'region:push', extent);
};


Map.prototype.waendAddLayer = function (layer) {
    this.addLayer(layer);
};

Map.prototype.waendRemoveLayer = function (layer) {
    this.removeLayer(layer);
};


module.exports = exports = Map;

