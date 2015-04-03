/*
 * app/src/Painter.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */

'use strict';


var _ = require('underscore'),
    semaphore = require('../lib/Semaphore');


function Painter (view, layerId) {
    this.context = view.getContext(layerId);
    this.transform = view.transform.clone();
    this.view = view;
    semaphore.on('view:change', this.resetTransform, this);
    this.resetTransform();
    this.resetClip();
}

Painter.prototype.handlers = {
    'draw': 'draw',
    'set': 'set',
    'clip': 'clip'
};


Painter.prototype.resetTransform = function () {
    var ctx = this.context,
        view = this.view,
        T = view.transform;
    this.transform = T.clone();
    // ctx.setTransform.apply(ctx, T.flatMatrix()); it scales linewidth
};


Painter.prototype.resetClip = function () {
    var ctx = this.context,
        view = this.view;

    this.context.rect(0, 0, view.size.width, view.size.height);
    this.context.clip();
};

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

// clipping
Painter.prototype.clip = function (cmd, coordinates) {
    // console.log('painter.clip', cmd, coordinates ? coordinates[0][0]: '-');
    if('end' === cmd) {
        this.context.restore();
        // this.resetClip();
    }
    else if('begin' === cmd) {
        this.context.save();
        this.drawPolygon(coordinates, ['clip']);
        // this.drawPolygon(coordinates, ['closePath', 'stroke']);
    }
};

Painter.prototype.drawPolygon = function (coordinates, ends) {
    // console.log('painter.polygon', coordinates[0][0], ends);
    ends = ends || ['closePath', 'stroke', 'fill'];
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
    for (var e = 0; e < ends.length; e++) {
        this.context[ends[e]]();
    }
};

Painter.prototype.drawLine = function (coordinates) {
    // console.log('painter.line', coordinates[0]);
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
    // this.context.closePath();
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


module.exports = exports = Painter;
