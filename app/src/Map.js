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
    Mutex = require('../lib/Mutex');



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

    semaphore.on('please:map:render', this.render, this);

    // this.updateQueue = new Queue();
    this.updateMutex = new Mutex();

    this.once('moveend', function(){
        this.listenToWaend();
        // this.listenToMe();
    }, this);

    var select = new ol.interaction.Select();
    this.addInteraction(select);
    select.on('select', function(e) {
        if (e.target.getFeatures().getLength() > 0) {
            var fs = e.target.getFeatures().getArray(),
                f = fs[0],
                path = '/' + f.get('path').join('/'),
                cl = 'cc ' + path ;
            semaphore.signal('terminal:run', cl);
            semaphore.signal('terminal:run', 'get');
        }
    });
}

ol.inherits(Map, ol.Map);

Map.prototype.listenToWaend = function () {
    this.onChangeViewKey = this.on('moveend', this.waendUpdateRegion, this);
    this.onChangeRegionKey = semaphore.on('region:change', this.waendUpdateExtent, this);
};

Map.prototype.unlistenToWaend = function () {
    this.unByKey(this.onChangeViewKey);
    semaphore.off(this.onChangeRegionKey);
};


Map.prototype.waendUpdateExtent = function (extent) {
    var view = this.getView(),
        size = this.getSize();

    this.updateMutex
        .get()
        .then(function(release){
            view.fitExtent(extent.extent, size);
            release();
        })
        .catch(function(){});
};

Map.prototype.waendUpdateRegion = function () {
    var view = this.getView(),
        extent = view.calculateExtent(this.getSize());

    this.updateMutex
        .get()
        .then(function(release){
            semaphore.signal('region:push', extent);
            release();
        })
        .catch(function(){});
};


Map.prototype.waendAddLayer = function (layer) {
    this.addLayer(layer);
};

Map.prototype.waendRemoveLayer = function (layer) {
    this.removeLayer(layer);
};


module.exports = exports = Map;
