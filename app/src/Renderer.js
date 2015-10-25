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
    Region = require('../lib/Region'),
    Projection = require('proj4'),
    W = require('./Worker'),
    Painter = require('./Painter'),
    Proj3857 = Projection('EPSG:3857');

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
    semaphore.on('map:update', this.render, this);
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


    var ts;

    worker.start();
    this.layer.on('update', function(){
        worker.once('data:init', function(){
            this.render();
        }, this);
        worker.post('init:data', this.layer.toJSON());
    }, this);

    worker.once('data:init', function(){
    console.log('R' + this.id, 'sent data in', _.now() - ts);
        this.isReady = true;
        if (this.pendingUpdate) {
            this.render();
        }
    }, this);
    ts = _.now()
    var data = this.layer.toJSON();
    console.log('R' + this.id, 'got data in', _.now() - ts);
    ts = _.now();
    worker.post('init:data', data);
    this.worker = worker;
};

CanvasRenderer.prototype.drawBackround = function () {
    var we = Region.getWorldExtent(),
        painter = this.painter,
        tl = we.getTopLeft().getCoordinates(),
        tr = we.getTopRight().getCoordinates(),
        br = we.getBottomRight().getCoordinates(),
        bl = we.getBottomLeft().getCoordinates(),
        trans = this.view.transform.clone();

    tl = trans.mapVec2(Proj3857.forward(tl));
    tr = trans.mapVec2(Proj3857.forward(tr));
    br = trans.mapVec2(Proj3857.forward(br));
    bl = trans.mapVec2(Proj3857.forward(bl));

    var coordinates = [ [tl, tr, br, bl] ];
    console.log('world', coordinates[0]);

    painter.save();
    painter.set('strokeStyle', '#888');
    painter.set('lineWidth', '0.5');
    painter.set('fillStyle', '#FFF');
    painter.drawPolygon(coordinates, ['closePath', 'stroke', 'fill']);
    painter.restore();
};

CanvasRenderer.prototype.render = function (isBackground) {
    if (!this.isVisible()) {
        this.painter.clear();
        return;
    }
    if (!this.isReady) {
        this.pendingUpdate = true;
        return;
    }
    var worker = this.worker;

    if (this.renderId) {
        var rid = this.renderId;
        worker.removeAllListeners(rid);
    }
    this.renderId = this.getNewRenderId();
    // worker.on('worker:render_id', function(rid){
    this.painter.clear();

    if (isBackground) {
        this.drawBackround();
    }

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
