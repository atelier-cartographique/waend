/*
 * app/src/View.js
 *     
 * 
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 * 
 * License in LICENSE file at the root of the repository.
 *
 */

'use strict';


var _ = require('underscore'),
    semaphore = require('../lib/Semaphore'),
    Geometry = require('../lib/Geometry'),
    Transform = require('../lib/Transform');

var document = window.document;

function View (options) {
    this.root = options.root;
    this.transform = new Transform();
    this.layers = [];
    this.canvas = [];
    this.contexts = [];

    var rect = this.root.getBoundingClientRect();
    this.size = _.pick(rect, 'width', 'height');
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
    return this;
};



module.exports = exports = View;

