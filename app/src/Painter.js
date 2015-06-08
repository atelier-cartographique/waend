/*
 * app/src/Painter.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */

// 'use strict';


var _ = require('underscore'),
    config = require('../../config'),
    Geometry = require('../lib/Geometry'),
    semaphore = require('../lib/Semaphore');

var MEDIA_URL = config.public.mediaUrl;

function Painter (view, layerId) {
    this.context = view.getContext(layerId);
    this.transform = view.transform.clone();
    this.view = view;
    semaphore.on('view:change', this.resetTransform, this);
    this.stateInc = 0;
    this.clear();

    this.context.globalCompositeOperation = 'multiply';
}

Painter.prototype.handlers = {
    'draw': 'draw',
    'set': 'set',
    'clip': 'clip',
    'context': 'rawContext',
    'image': 'image',
    'instructions': 'processInstructions',
    'save': 'save',
    'restore': 'restore'
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
    while (this.stateInc > 0) {
        this.restore();
    }
    this.resetTransform();
    this.resetClip();
    this.context.clearRect(0, 0, this.view.size.width, this.view.size.height);
};
//
// Painter.prototype.mapPoint = function (p) {
//     return this.transform.mapVec2(p);
// };

Painter.prototype.save = function () {
    this.context.save();
    this.stateInc += 1;
};

Painter.prototype.restore = function () {
    this.context.restore();
    this.stateInc -= 1;
};

Painter.prototype.wrap = function (f, ctx) {
    this.save();
    f.call(ctx, this);
    this.restore();
};

// graphic state
Painter.prototype.set = function (prop, value) {
    if (this.context[prop]) {
        this.context[prop] = value;
    }
    else if ('lineDash' === prop) {
        this.context.setLineDash(value);
    }

};

// clipping
Painter.prototype.clip = function (cmd, coordinates) {
    // console.log('painter.clip', cmd, coordinates ? coordinates[0][0]: '-');
    if('end' === cmd) {
        this.restore();
        // this.resetClip();
    }
    else if('begin' === cmd) {
        this.save();
        this.drawPolygon(coordinates, ['clip']);
        // this.drawPolygon(coordinates, ['closePath', 'stroke']);
    }
};

Painter.prototype.drawPolygon = function (coordinates, ends) {
    // console.log('painter.polygon', coordinates[0][0], ends);
    ends = ends || ['closePath', 'stroke'];
    this.context.beginPath();
    for(var i = 0; i < coordinates.length; i++) {
        var ring = coordinates[i];
        for(var ii = 0; ii < ring.length; ii++) {
            var p = ring[ii];
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

Painter.prototype.image = function (coordinates, extentArray, options) {
    var self = this,
        img = document.createElement('img'),
        url = MEDIA_URL + '/' + options.image,
        extent = new Geometry.Extent(extentArray),
        width = extent.getWidth(),
        height = extent.getHeight();

    var complete = function () {
        // now we're supposed to have access to image size
        var imgWidth = img.naturalWidth,
            imgHeight = img.naturalHeight,
            sw = extent.getBottomLeft().getCoordinates(),
            scale;

        if ('none' === options.adjust) {
            imgWidth = width;
            imgHeight = height;
        }
        else if ('fit' === options.adjust) {
            scale = Math.min(width/imgWidth, height/imgHeight);
            imgWidth = imgWidth * scale;
            imgHeight = imgHeight * scale;
            if ((width - imgWidth) < (height - imgHeight)) {
                sw[1] += (height - imgHeight) / 2;
            }
            else {
                sw[0] += (width - imgWidth) / 2;
            }
        }
        else if ('cover' === options.adjust) {
            scale = Math.max(width/imgWidth, height/imgHeight);
            imgWidth = imgWidth * scale;
            imgHeight = imgHeight * scale;
            if ((width - imgWidth) > (height - imgHeight)) {
                sw[1] += (height - imgHeight) / 2;
            }
            else {
                sw[0] += (width - imgWidth) / 2;
            }
        }

        self.save();
        if (options.clip) {
            self.drawPolygon(coordinates, ['clip']);
        }
        self.context.drawImage(img, sw[0], sw[1], imgWidth, imgHeight);
        self.restore();
    };

    var getStep = function (sz) {
        var steps = [ 4, 8, 16, 32, 64, 128, 256, 512, 1024 ],
            sl = steps.length;
        for (var i = sl - 1; i >= 0; i--) {
            if (sz >= steps[i]) {
                if (i < (sl - 1)){
                    return steps[i + 1];
                }
                return steps[i];
            }
        }
    };

    img.src = url + '/' + getStep(Math.max(width, height));
    if (img.complete) {
        complete();
    }
    else {
        img.addEventListener('load', complete, false);
    }
};

Painter.prototype.drawLine = function (coordinates) {
    // console.log('painter.line', coordinates[0]);
    this.context.beginPath();
    for(var i = 0; i < coordinates.length; i++) {
        var p = coordinates[i];
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

Painter.prototype.rawContext = function () {
    var args = _.toArray(arguments),
        method = args.shift(),
        p0, p1, p2;

    switch (method) {
        case 'beginPath':
            this.context.beginPath();
            break;
        case 'moveTo':
            this.context.moveTo.apply(this.context, [args[0], args[1]]);
            break;
        case 'lineTo':
            this.context.lineTo.apply(this.context, [args[0], args[1]]);
            break;
        case 'bezierCurveTo':
            p0 = [args[0], args[1]];
            p1 = [args[2], args[3]];
            p2 = [args[4], args[5]];
            this.context.bezierCurveTo(p0[0], p0[1], p1[0], p1[1], p2[0], p2[1]);
            break;
        case 'quadraticCurveTo':
            p0 = [args[0], args[1]];
            p1 = [args[2], args[3]];
            this.context.quadraticCurveTo(p0[0], p0[1], p1[0], p1[1]);
            break;
        case 'closePath':
            this.context.closePath();
            break;
        case 'stroke':
            this.context.stroke();
            break;
        case 'fill':
            this.context.fill();
            break;
    }
};

Painter.prototype.processInstructions = function (instructions) {
    for (var i = 0; i < instructions.length; i++) {
        this.rawContext.apply(this, instructions[i]);
    }
};



module.exports = exports = Painter;
