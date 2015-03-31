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
    ol3 = require('openlayers'),
    semaphore = require('../lib/Semaphore'),
    W = require('./Worker');


function Painter (view, layerId) {
    this.context = view.getContext(layerId);
    this.transform = view.transform;
    this.view = view;
}

Painter.prototype.clear = function () {
    this.context.clearRect(0, 0, this.view.size.width, this.view.size.height);
};

Painter.prototype.mapPoint = function (p) {
    return this.transform.mapVec2(p);
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
 * projection => {forward()}
 */
function CanvasRenderer (options) {
    this.layer = options.layer;
    this.view = options.view;
    this.proj = options.projection;
    this.painter = new Painter(this.view, this.layer.id);

    semaphore.on('map:update', this.render, this);
}

CanvasRenderer.prototype.transformFn = function () {
    var forward = this.proj.forward;
    var tfn = function (coords) {
        var ret = forward(coords);
        return ret;
    };
    return ol3.proj.createTransformFromCoordinateTransform(tfn);
};


CanvasRenderer.prototype.render = function () {
    var worker = new W(this.layer.getProgram()),
        features = this.layer.getFeatures();

    worker.on('draw', this.painter.draw, this.painter);
    worker.on('set', this.painter.set, this.painter);
    worker.start();
    this.painter.clear();
    for (var i = 0; i < features.length; i++) {
        var f = features[i],
            geom = f.getGeometry(),
            geomType = geom.getType().toLowerCase(),
            props = _.omit(f.getProperties(), 'geometry');

        geom.applyTransform(this.transformFn());
        worker.post(geomType, geom.getCoordinates(), props);
    }

};


module.exports = exports = CanvasRenderer;
