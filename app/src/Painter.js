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

function ImageLoader (painter) {
    this.painter = painter;
};

ImageLoader.prototype.load = function (coordinates, extentArray, options) {
    var self = this,
        painter = self.painter,
        img = document.createElement('img'),
        url = MEDIA_URL + '/' + options.image,
        extent = new Geometry.Extent(extentArray),
        width = extent.getWidth(),
        height = extent.getHeight();

    var complete = function () {
        if (self.cancelDrawing) {
            return;
        }
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

        painter.save();
        if (options.clip) {
            painter.drawPolygon(coordinates, ['clip']);
        }
        if (options.rotation) {
            var rot = options.rotation * Math.PI / 180,
                cx = sw[0] + (imgWidth / 2),
                cy = sw[1] + (imgHeight / 2);

            painter.context.translate(cx, cy);
            painter.context.rotate(rot);
            painter.context.translate(-cx, -cy);
        }
        painter.context.drawImage(img, sw[0], sw[1], imgWidth, imgHeight);
        painter.restore();
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

ImageLoader.prototype.cancel = function () {
    this.cancelDrawing = true;
};


function Painter (view, layerId) {
    var baseContext = view.getContext(layerId);
    var currentContext = baseContext;



    Object.defineProperty(this, 'context', {
        get: function () {
            return currentContext;
        },

        set: function (ctx) {
            currentContext = ctx;
        }
    });

    this.restoreContext = function () {
        currentContext = baseContext;
    };

    this.transform = view.transform.clone();
    this.view = view;
    semaphore.on('view:change', this.resetTransform, this);
    this.stateInc = 0;
    this.imagesLoading = [];
    this.clear();

}

Painter.prototype.handlers = {
    'draw': 'draw',
    'set': 'set',
    'clip': 'clip',
    'context': 'rawContext',
    'image': 'image',
    'instructions': 'processInstructions',
    'save': 'save',
    'restore': 'restore',
    'transform': 'setTransform',
    'clear' : 'clear',
    'clearRect' : 'clearRect',
    'startTexture': 'startTexture',
    'endTexture': 'endTexture',
    'applyTexture': 'applyTexture'
};

Painter.prototype.setTransform = function (a,b,c,d,e,f) {
    this.context.setTransform(a,b,c,d,e,f);
};

Painter.prototype.resetTransform = function () {
    var ctx = this.context,
        view = this.view,
        T = view.transform;
    this.transform = T.clone();
};


Painter.prototype.resetClip = function () {
    var ctx = this.context,
        view = this.view;

    this.context.beginPath();
    this.context.rect(0, 0, view.size.width, view.size.height);
    this.context.clip();
};


Painter.prototype.clear = function () {
    while (this.stateInc > 0) {
        this.restore();
    }
    for (var i = 0; i < this.imagesLoading.length; i++) {
        this.imagesLoading[i].cancel();
    }
    this.imagesLoading = [];
    this.textures = {};
    this.resetTransform();
    this.resetClip();
    this.context.clearRect(0, 0, this.view.size.width, this.view.size.height);
    this.context.globalCompositeOperation = 'multiply';
};


Painter.prototype.clearRect = function (coordinates) {
    var extent = new Geometry.Extent(coordinates),
    tl = extent.getBottomLeft().getCoordinates();
    this.context.clearRect(tl[0], tl[1],
        extent.getWidth(), extent.getHeight());
    };

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

Painter.prototype.startTexture = function (tid) {
    var canvas = document.createElement('canvas');
    canvas.width = this.context.canvas.width;
    canvas.height = this.context.canvas.height;
    var ctx = canvas.getContext('2d');
    ctx.textureId = tid;
    this.textures[tid] = {
        canvas: canvas,
        context: ctx
    };
    this.context = ctx;
};

Painter.prototype.endTexture = function () {
    this.restoreContext();
};

Painter.prototype.applyTexture = function (tid) {
    var canvas = this.textures[tid].canvas;
    this.context.drawImage(canvas, 0, 0);
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
    var loader = new ImageLoader(this);
    this.imagesLoading.push(loader);
    loader.load(coordinates, extentArray, options);
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

Painter.prototype.draw = function (instruction, coordinates, ends) {

    if ('polygon' === instruction) {
        this.drawPolygon(coordinates, ends);
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
