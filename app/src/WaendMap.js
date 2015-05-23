/*
 * app/src/Map.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */

// 'use strict';


var _ = require('underscore'),
    proj4 = require('proj4'),
    region = require('../lib/Region'),
    Geometry = require('../lib/Geometry'),
    semaphore = require('../lib/Semaphore'),
    Renderer = require('./Renderer'),
    View = require('./View'),
    Mutex = require('../lib/Mutex');



function Map (options) {
    this.projection = proj4(options.projection || 'EPSG:3857');
    this.renderers = {};

    var viewOptions = _.pick(options, 'root');
    viewOptions.extent = this.projectedExtent(options.extent || region.get());
    this.view = new View(viewOptions);

    this.listenToWaend();
}

Map.prototype.listenToWaend = function () {
    semaphore.on('layer:layer:add', this.waendAddLayer, this);
    semaphore.on('layer:layer:remove', this.waendRemoveLayer, this);
    semaphore.on('please:map:render', this.render, this);
    semaphore.on('region:change', this.waendUpdateExtent, this);
};

Map.prototype.unlistenToWaend = function () {
};

Map.prototype.projectedExtent = function (extent) {
    var bl = this.projection.forward(extent.getBottomLeft().getCoordinates()),
        tr = this.projection.forward(extent.getTopRight().getCoordinates()),
        pr = [bl[0], bl[1], tr[0], tr[1]];
    return new Geometry.Extent(pr);
};

Map.prototype.waendUpdateExtent = function (extent) {
    this.view.setExtent(this.projectedExtent(extent));
    this.render();
};

Map.prototype.waendUpdateRegion = function () {
};

Map.prototype.render = function () {
    _.each(this.renderers, function(rdr){
        rdr.render();
    });
};


Map.prototype.waendAddLayer = function (layer) {
    this.view.addLayer(layer);
    var renderer = new Renderer({
        'view': this.view,
        'projection': this.projection,
        'layer': layer
    });

    this.renderers[layer.id] = renderer;
    renderer.render();
};

Map.prototype.waendRemoveLayer = function (layer) {
    this.renderers[layer.id].stop();
    delete this.renderers[layer.id];
    this.view.removeLayer(layer);
};


Map.prototype.getCoordinateFromPixel = function (pixel) {
    var v = Array.apply(null, pixel),
        inverse = this.view.transform.inverse(),
        tv = inverse.mapVec2(v);
    // console.log('map.getCoordinateFromPixel', v, inverse.flatMatrix(), tv);
    return this.projection.inverse(tv);
};

Map.prototype.getPixelFromCoordinate = function (coord) {
    var v = Array.apply(null, coord),
        pv = this.projection.forward(v),
        tv = this.view.transform.mapVec2(pv);
    return tv;
};

Map.prototype.getFeatures = function (extent) {
    return this.view.getFeatures(extent);
};

module.exports = exports = Map;
