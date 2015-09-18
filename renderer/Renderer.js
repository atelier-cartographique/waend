/*
 * renderer/Renderer.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */
//
// 'use strict';


var _ = require('underscore'),
    Geometry = require('../app/lib/Geometry'),
    W = require('./ServerWorker'),
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
    this._visible = true;
    this.painter = new Painter(this.view, this.layer.id);
    this.initWorker();
    this.features = {};
}

CanvasRenderer.prototype.setVisibility = function (v) {
    this._visible = !!v;
};

CanvasRenderer.prototype.isVisible = function () {
    return this._visible;
};

CanvasRenderer.prototype.getNewRenderId = function () {
    return (this.id + '.' + _.uniqueId());
};

CanvasRenderer.prototype.dispatch = function () {
    var painter = this.painter,
        handlers = painter.handlers,
        revent = arguments[0],
        args = [];
    // console.log('dispatch', revent);
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
    worker.start();
    var data = this.layer.toJSON();
    worker.post('init:data', data);
    this.worker = worker;
};

CanvasRenderer.prototype.render = function (ender) {
    if (!this.isVisible()) {
        this.painter.clear();
        return;
    }
    var worker = this.worker;


    if (this.renderId) {
        var rid = this.renderId;
        worker.removeAllListeners(rid);
    }
    worker.once('frame:end', function () {
        if (ender) {
            ender();
        }
    });
    this.renderId = this.getNewRenderId();
    worker.on('worker:render_id', function(rid){
        // this.painter.clear();
        console.log('RENDER START', this.renderId);
        var extent = this.view.getGeoExtent(this.proj);
        worker.on(this.renderId, this.dispatch, this);
        worker.post('update:view', this.renderId,
                    extent, this.view.transform.flatMatrix());
        }, this);
    worker.post('worker:render_id', this.renderId);
};

CanvasRenderer.prototype.stop = function () {
    this.worker.stop();
};


module.exports = exports = CanvasRenderer;
