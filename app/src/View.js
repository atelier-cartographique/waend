/*
 * app/src/View.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */

// 'use strict';


var _ = require('underscore'),
    semaphore = require('../lib/Semaphore'),
    Geometry = require('../lib/Geometry'),
    Transform = require('../lib/Transform');

var document = window.document;

function View (options) {
    this.root = options.root;
    this.extent = options.extent;
    this.transform = new Transform();
    this.layers = [];
    this.canvas = [];
    this.contexts = [];

    var rect = this.getRect();
    this.size = _.pick(rect, 'width', 'height');
    this.setTransform();
}


View.prototype.getRect = function () {
    return this.root.getBoundingClientRect();
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
    semaphore.signal('view:change', this);
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
    t.scale(s, -s, {'x': tcx, 'y': tcy});
    this.transform.reset(t);
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

View.prototype.getFeaturesAt = function (coordinate) {
    var features = [];
    for (var i = 0; i < this.layers.length; i++) {
        var lyr = this.layers[i],
            fts = lyr.getFeaturesAtCoordinate(coordinate);
        if (fts) {
            features = features.concat(fts);
        }
    }
    return features;
};

View.prototype.getContext = function (layerId) {
    var idx = _.findIndex(this.contexts, function (ctx) {
        return (layerId === ctx.id);
    });
    if (idx < 0) {
        return null;
    }
    return this.contexts[idx];
};

View.prototype.createCanvas = function (layerId) {
    var canvas = document.createElement('canvas'),
        rect = this.root.getBoundingClientRect();

    canvas.id = layerId;
    canvas.width = rect.width;
    canvas.height = rect.height;
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.zIndex = this.canvas.length;
    this.canvas.push(canvas);
    this.root.appendChild(canvas);
    return canvas;
};

View.prototype.createContext = function (layerId, canvas) {
    var ctx = canvas.getContext('2d');
    ctx.id = layerId;
    // here should go some sort of init.

    this.contexts.push(ctx);
    return (this.contexts.length - 1);
};

View.prototype.addLayer = function (layer) {
    if(!!(this.getLayer(layer.id))){
        return;
    }
    var canvas = this.createCanvas(layer.id);
    var contextIndex = this.createContext(layer.id, canvas);
    this.layers.push(layer);
    return this;
};

View.prototype.removeLayer = function (layer) {
    if(!!(this.getLayer(layer.id))){
        this.layers = _.reject(this.layers, function (l) {
            return (l.id === layer.id);
        });
        this.contexts = _.reject(this.contexts, function(c) {
            return (c.id === layer.id);
        });

        var canvasElement = document.getElementById(layer.id);
        this.root.removeChild(canvasElement);
        this.canvas = _.reject(this.canvas, function (c) {
            return (c.id === layer.id);
        });
        return this;
    }
};



module.exports = exports = View;
