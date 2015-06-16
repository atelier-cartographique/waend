/*
 * renderer/WaendMap.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */

// 'use strict';


var Renderer = require('./Renderer'),
    proj4 = require('proj4'),
    Geometry = require('../app/lib/Geometry'),
    View = require('./View');



function Map (options) {
    options = options || {};
    this.projection = proj4(options.projection || 'EPSG:3857');
    this.renderers = {};
    this.view = new View({
        'extent': this.projectedExtent(options.extent)
    });
}

Map.prototype.projectedExtent = function (extent) {
    var bl = this.projection.forward(extent.getBottomLeft().getCoordinates()),
        tr = this.projection.forward(extent.getTopRight().getCoordinates()),
        pr = [bl[0], bl[1], tr[0], tr[1]];
    return new Geometry.Extent(pr);
};

Map.prototype.waendAddLayer = function (layer, ender) {
    this.view.addLayer(layer);
    var renderer = new Renderer({
        'view': this.view,
        'projection': this.projection,
        'layer': layer
    });
    renderer.render(ender);
};

module.exports = exports = Map;
