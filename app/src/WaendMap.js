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
    proj4 = require('proj4'),
    Geometry = require('../lib/Geometry'),
    semaphore = require('../lib/Semaphore'),
    Renderer = require('./Renderer'),
    View = require('./View'),
    Mutex = require('../lib/Mutex');



function Map (options) {
    this.view = new View(_.pick(options, 'root'));
    this.projection = proj4(options.projection || 'EPSG:3857');

    this.renderers = {};

    semaphore.on('layer:layer:add', this.waendAddLayer, this);
    semaphore.on('layer:layer:remove', this.waendRemoveLayer, this);
    semaphore.on('please:map:render', this.render, this);
};

Map.prototype.listenToWaend = function () {
};

Map.prototype.unlistenToWaend = function () {
};


Map.prototype.waendUpdateExtent = function (extent) {
};

Map.prototype.waendUpdateRegion = function () {
};


Map.prototype.waendAddLayer = function (layer) {
    this.view.addLayer(layer);
    var renderer = new Renderer({
        'view': this.view,
        'projection': this.projection,
        'layer': layer
    });

    this.renderers[layer.id] = renderer;

    layer.on('addfeature', function (event) {
        renderer.render();
    }, this);
};

Map.prototype.waendRemoveLayer = function (layer) {
};


module.exports = exports = Map;

