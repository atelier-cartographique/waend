/*
 * renderer/View.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */

// 'use strict';


var _ = require('underscore'),
    Canvas = require('canvas'),
    Geometry = require('../app/lib/Geometry'),
    Transform = require('../app/lib/Transform');

var defaultRect = {
    'width': 1000,
    'height': 1000
};

function View (options) {
    options = options || {};
    this.rect = options.rect || defaultRect;
    this.extent = options.extent || (new Geometry.Extent([0,0,1,1]));
    this.transform = new Transform();
    this.layers = [];

    var rect = this.getRect();
    this.size = _.pick(rect, 'width', 'height');
    this.setTransform();
}


View.prototype.getRect = function () {
    return this.rect;
};

View.prototype.translate = function (dx, dy) {
    this.transform.translate(dx, dy);
    return this;
};

View.prototype.scale = function (sx, sy) {
    this.transform.translate(sx, sy);
    return this;
};

View.prototype.setExtent = function (extent) {
    var rect = this.getRect(),
        sx = rect.width / Math.abs(extent.getWidth()),
        sy = rect.height / Math.abs(extent.getHeight()),
        s = (sx < sy) ? sx : sy,
        center = extent.getCenter().getCoordinates();
    if (sx < sy) {
        // adjust extent height
        var newHeight = rect.height * (1/s),
            adjH = newHeight / 2;
        extent.extent[1] = center[1] - adjH;
        extent.extent[3] = center[1] + adjH;
    }
    else {
        // adjust extent width
        var newWidth = rect.width * (1/s),
            adjW = newWidth / 2;
        extent.extent[0] = center[0] - adjW;
        extent.extent[2] = center[0] + adjW;
    }
    this.extent = extent;
    this.setTransform();
};

View.prototype.setTransform = function () {
    var extent = this.extent,
        rect = this.getRect(),
        halfSize = [rect.width/2, rect.height/2],
        sx = rect.width / Math.abs(extent.getWidth()),
        sy = rect.height / Math.abs(extent.getHeight()),
        s = (sx < sy) ? sx : sy,
        is = (1/s),
        center = extent.getCenter().getCoordinates(),
        // tcx = (halfSize[0] * is) - center[0],
        // tcy = ((halfSize[1] * is) - center[1]) - Math.abs(extent.getHeight());
        tcx = halfSize[0]  - (center[0] * s),
        tcy = (Math.abs(extent.getHeight()) * s) - (halfSize[1] - (center[1] * s)) ;
    var t = new Transform();
    t.translate(tcx, tcy);
    t.scale(s, -s, [tcx, tcy]);
    this.transform.reset(t);
};

View.prototype.getGeoExtent = function (projection) {
    var pExtent = this.extent,
        projectedMin = pExtent.getBottomLeft().getCoordinates(),
        projectedMax = pExtent.getTopRight().getCoordinates(),
        min = projection.inverse(projectedMin),
        max = projection.inverse(projectedMax);
    return min.concat(max);
};

View.prototype.getProjectedPointOnView = function (x, y) {
    var v = [x,y],
        inv = this.transform.inverse();
    inv.mapVec2(v);
    return v;
};


View.prototype.getViewPointProjected = function (x, y) {
    var v = [x,y];
    this.transform.mapVec2(v);
    return v;
};


View.prototype.getLayer = function (layerId) {
    var idx = _.findIndex(this.layers, function (layer) {
        return (layerId === layer.id);
    });
    if (idx < 0) {
        return null;
    }
    return this.layers[idx];
};

View.prototype.getFeatures = function (extent) {
    var features = [];
    for (var i = 0; i < this.layers.length; i++) {
        var lyr = this.layers[i],
            fts = lyr.getFeatures(extent);
        if (fts) {
            features = features.concat(fts);
        }
    }
    return features;
};

View.prototype.getContext = function (layerId) {
    // this.context.addPage();
    return this.context;
};

View.prototype.createCanvas = function (layerId) {
    var rect = this.getRect();
    this.canvas = new Canvas(rect.width, rect.height, 'pdf');
};

View.prototype.createContext = function () {
    this.context = this.canvas.getContext('2d');
};

View.prototype.addLayer = function (layer) {
    if(!this.context){
        this.createCanvas();
        this.createContext();
    }
    return this;
};

View.prototype.getBuffer = function () {
    return this.canvas.toBuffer();
};


module.exports = exports = View;
