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
    semaphore = require('../lib/Semaphore'),
    W = require('./Worker'),
    Painter = require('./Painter');

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
    this.initWorker();
    this.features = {};
    semaphore.on('map:update', this.render, this);
}

CanvasRenderer.prototype.initWorker = function () {
    var worker = new W(this.layer.getProgram());
    worker.on('draw', this.painter.draw, this.painter);
    worker.on('set', this.painter.set, this.painter);
    worker.start();
    this.worker = worker;
};


CanvasRenderer.prototype.polygonTransform = function (coordinates) {
    for (var i = 0; i < coordinates.length; i++) {
        var ringLength = coordinates[i].length;
        for (var ii = 0; ii < ringLength; ii++) {
            coordinates[i][ii] = this.proj.forward(coordinates[i][ii]);
        }
    }
};

CanvasRenderer.prototype.lineTransform = function (coordinates) {
    for (var i = 0; i < coordinates.length; i++) {
        coordinates[i] = this.proj.forward(coordinates[i]);
    }
};

CanvasRenderer.prototype.renderFeature = function (feature) {
    if (feature.id in this.features) {
        return;
    }
    this.features[feature.id] = true;
    var geom = feature.getGeometry(),
        geomType = geom.getType().toLowerCase(),
        props = _.omit(feature.getProperties(), 'geometry'),
        coordinates = geom.getCoordinates();

    try {
        this[geomType+'Transform'](coordinates);
        this.worker.post(geomType, coordinates, props);
    }
    catch (err) {
        this.features[feature.id] = false;
    }
};

CanvasRenderer.prototype.drawGrid = function () {
    var n = 10000, s = 10;
    for (var i = -n; i < (n + 1); i += (n/s)) {
        this.painter.drawLine([[i, -n], [i, n]]);
        this.painter.drawLine([[n, -i], [n, i]]);
    }
};

CanvasRenderer.prototype.render = function () {
    var worker = this.worker,
        features = this.layer.getFeatures();

    this.painter.clear();
    this.drawGrid();
    this.features = {};
    for (var i = 0; i < features.length; i++) {
        var f = features[i],
            geom = f.getGeometry(),
            geomType = geom.getType().toLowerCase(),
            props = _.omit(f.getProperties(), 'geometry'),
            coordinates = geom.getCoordinates();

        try {
            this[geomType+'Transform'](coordinates);
            worker.post(geomType, coordinates, props);
        }
        catch (err) {
            this.features[f.id] = false;
        }
        this.features[f.id] = true;
    }

};

CanvasRenderer.prototype.stop = function () {
    this.worker.stop();
};


module.exports = exports = CanvasRenderer;
