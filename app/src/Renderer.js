/*
 * app/src/Renderer.js
 *     
 * 
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 * 
 * License in LICENSE file at the root of the repository.
 *
 */

'use strict';


var _ = require('underscore'),
    util = require("util"),
    ol = require('openlayers'),
    Geometry = require('../lib/Geometry'),
    semaphore = require('../lib/Semaphore'),
    W = require('./Worker');


function Painter (view, layerIndex) {
    this.context = view.contexts[layerIndex];
    this.transform = view.transform;
    this.view = view;
}

Painter.prototype.clear = function () {
    this.context.clearRect(0, 0, this.view.size.width, this.view.size.height);
};

Painter.prototype.mapPoint = function (p) {
    return this.transform.mapPoint(p);
};

// graphic state
Painter.prototype.set = function (prop, value) {
    this.context[prop] = value;
};

Painter.prototype.drawPolygon = function (coordinates) {
    this.context.beginPath();
    for(var i = 0; i < coordinates.length; i++) {
        var ring = coordinates[i];
        for(var ii = 0; ii < ring.length; ii++) {
            var p = this.mapPoint(ring[ii]);
            if(0 === ii){
                this.context.moveTo(p[0], p[1]);
            }
            else{
                this.context.lineTo(p[0], p[1]);
            }
        }
    }
    this.context.closePath();
    this.context.stroke();
    this.context.fill();
};

Painter.prototype.drawLine = function (coordinates) {
    this.context.beginPath();
    for(var i = 0; i < coordinates.length; i++) {
        var p = this.mapPoint(coordinates[i]);
        if(0 === i){
            this.context.moveTo(p[0], p[1]);
        }
        else{
            this.context.lineTo(p[0], p[1]);
        }
    }
    this.context.closePath();
    this.context.stroke();
};

Painter.prototype.draw = function (instruction, coordinates) {

    if ('polygon' === instruction) {
        this.drawPolygon(coordinates);
    }
    else if ('line' === instruction) {
        this.drawLine(coordinates);
    }
    else {
        var args = _.toArray(arguments),
            method = args.shift();
        if (method && (method in this.context)) {
            this.context[method].apply(this.context, args);
        }
    }

};




/**
 *
 * options:
 * view => View
 */
function CanvasRenderer (options) {
    this.view = options.view;
    this.proj = options.projection;
    this.painter = new Painter(view, options.layerIndex);
};





CanvasRenderer.prototype.render = function (features, program) {
    var worker = new W(program);

    worker.on('draw', this.painter.draw, this.painter);
    worker.on('set', this.painter.set, this.painter);

    this.painter.clear();
    for (var i = 0; i < features.length; i++) {
        var f = features[i],
            geom = f.getGeometry().applyTransform(this.proj.forward),
            geomType = geom.getType().toLowerCase(),
            props = f.getProperties(),
            coordinates = geom.getCoordinates();

        worker.post(geomType, coordinates, props);
    }

};


module.exports = exports = CanvasRenderer;

