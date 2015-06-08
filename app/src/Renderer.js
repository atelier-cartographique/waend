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
    this.id = _.uniqueId();
    this.layer = options.layer;
    this.view = options.view;
    this.proj = options.projection;
    this.painter = new Painter(this.view, this.layer.id);
    this.initWorker();
    this.features = {};
    semaphore.on('map:update', this.render, this);
}

CanvasRenderer.prototype.getNewRenderId = function () {
    return (this.id + '.' + _.uniqueId());
};

CanvasRenderer.prototype.dispatch = function () {
    // var rid = arguments[0];
    // if (rid !== this.renderId) {
    //     console.warn('discarding render event', rid, this.renderId);
    //     return;
    // }

    var painter = this.painter,
        handlers = painter.handlers,
        revent = arguments[0],
        args = [];
    for (var i = 1; i < arguments.length; i++) {
        args.push(arguments[i]);
    }

    if (revent in handlers) {
        painter[handlers[revent]].apply(painter, args);
    }

};

CanvasRenderer.prototype.initWorker = function () {
    var self = this;
    var worker = new W(this.layer.getProgram());
    // var handler = function (m) {
    //     return function () {
    //         m.apply(self.painter, arguments);
    //     };
    // };
    // for (var pk in this.painter.handlers) {
    //     var method = this.painter[this.painter.handlers[pk]];
    //     worker.on(pk, handler(method));
    // }




    worker.start();
    this.layer.on('update', function(){
        worker.once('data:init', function(){
            this.render();
        }, this);
        worker.post('init:data', this.layer.toJSON());
    }, this);

    worker.once('data:init', function(){
        this.isReady = true;
        if (this.pendingUpdate) {
            this.render();
        }
    }, this);
    var data = this.layer.toJSON();
    worker.post('init:data', data);
    this.worker = worker;
};

CanvasRenderer.prototype.render = function (opt_extent) {
    if (!this.isReady) {
        this.pendingUpdate = true;
        return;
    }
    var worker = this.worker;

    if (this.renderId) {
        console.log('removing handler', this.renderId);
        worker.removeAllListeners(this.renderId);
    }
    this.renderId = this.getNewRenderId();
    // worker.on('worker:render_id', function(rid){
    this.painter.clear();
    console.log('RENDER START', this.renderId);
    var extent = this.view.getGeoExtent(this.proj);
    worker.on(this.renderId, this.dispatch, this);
    worker.post('update:view', this.renderId,
                extent, this.view.transform.flatMatrix());
    // }, this);

    // worker.post('worker:render_id', this.renderId);
};

CanvasRenderer.prototype.stop = function () {
    this.worker.stop();
};


module.exports = exports = CanvasRenderer;
