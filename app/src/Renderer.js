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
    Geometry = require('../lib/Geometry'),
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
    var self = this;
    var worker = new W(this.layer.getProgram());
    var handler = function (m) {
        return function () {
            var rid = arguments[0];
            if (rid !== self.renderId) {
                return;
            }
            var args = new Array(arguments.length - 1);
            for (var i = 1; i < arguments.length; i++) {
                args[i-1] = arguments[i];
            }
            m.apply(self.painter, args);
        };
    };
    for (var pk in this.painter.handlers) {
        var method = this.painter[this.painter.handlers[pk]];
        // worker.on(pk, method, this.painter);
        worker.on(pk, handler(method));
    }
    worker.start();
    this.worker = worker;
};


CanvasRenderer.prototype.renderFeature = function (feature) {
    var id = feature.getId();
    if ((id in this.features) && this.features[id]) {
        return;
    }
    this.features[id] = true;
    var geom = feature.getGeometry(),
        geomType = geom.getType().toLowerCase(),
        dFeature = feature.feature,
        props = _.defaults(dFeature.getData(), this.layer.layer.getData()),
        coordinates = geom.getCoordinates();

    if (!feature.eventId) {
        feature.eventId = dFeature.on('set set:data', function(key, val){
            // this.render(feature.getGeometry().getExtent());
            this.render();
        }, this);
    }

    try {
        this.worker.post(geomType, this.renderId, coordinates, props, this.view.transform.flatMatrix());
    }
    catch (err) {
        this.features[feature.id] = false;
    }
};

CanvasRenderer.prototype.render = function (opt_extent) {
    var self = this,
        worker = this.worker,
        pExtent = opt_extent ? (new Geometry.Extent(opt_extent)) : this.view.extent,
        projectedMin = pExtent.getBottomLeft().getCoordinates(),
        projectedMax = pExtent.getTopRight().getCoordinates(),
        min = this.proj.inverse(projectedMin),
        max = this.proj.inverse(projectedMax),
        extent = min.concat(max);

    // TODO clear only to features list extent
    this.renderId = _.uniqueId();
    this.worker.post('worker:render_id', this.renderId);
    this.painter.clear();
    this.features = {};
    console.log('RENDER START', this.renderId);

    var rf = function (f) {
        // console.log('RENDER FEATURE', renderId);
        self.renderFeature(f);
    };

    this.layer.forEachFeatureInExtent(extent, rf);
    // console.log('RENDER STOP', renderId);
};

CanvasRenderer.prototype.stop = function () {
    this.worker.stop();
};


module.exports = exports = CanvasRenderer;
