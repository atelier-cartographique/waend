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
            // var rid = arguments[0];
            // if (rid !== self.renderId) {
            //     return;
            // }
            // var args = new Array(arguments.length - 1);
            // for (var i = 1; i < arguments.length; i++) {
            //     args[i-1] = arguments[i];
            // }
            m.apply(self.painter, arguments);
        };
    };
    for (var pk in this.painter.handlers) {
        var method = this.painter[this.painter.handlers[pk]];
        // worker.on(pk, method, this.painter);
        worker.on(pk, handler(method));
    }
    worker.start();
    this.layer.on('update', function(){
        worker.once('data:init', function(){
            this.render();
        }, this);
        worker.post('init:data', this.layer.toJSON());
    }, this);
    // console.log('Render subscribed to layer', this.layer.id);

    worker.once('data:init', function(){
        this.isReady = true;
        if (this.pendingUpdate) {
            this.render();
        }
    }, this);
    var data = this.layer.toJSON();
    // console.log('Renderer send data', this.layer.id, data.length);
    worker.post('init:data', data);
    this.worker = worker;
};

CanvasRenderer.prototype.render = function (opt_extent) {
    if (!this.isReady) {
        this.pendingUpdate = true;
        return;
    }
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
    this.worker.once('worker:render_id:'+this.renderId, function(){
        // console.log('RENDER START', this.renderId);
        this.painter.clear();
        this.worker.post('update:view', extent, this.view.transform.flatMatrix());
    }, this);
    // this.features = {};
    this.worker.post('worker:render_id', this.renderId);
};

CanvasRenderer.prototype.stop = function () {
    this.worker.stop();
};


module.exports = exports = CanvasRenderer;
