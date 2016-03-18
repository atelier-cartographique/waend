/*
 * app/lib/src/Navigator.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */

// 'use strict';

var _ = require('underscore'),
    util = require('util'),
    Promise = require('bluebird'),
    Geometry = require('../lib/Geometry'),
    Transform = require('../lib/Transform'),
    Projection = require('proj4'),
    region = require('../lib/Region'),
    semaphore = require('../lib/Semaphore'),
    turf = require('turf'),
    Transport = require('../lib/Transport'),
    helpers = require('../lib/helpers');


var Proj3857 = Projection('EPSG:3857');

var projectExtent = helpers.projectExtent,
    unprojectExtent = helpers.unprojectExtent,
    transformExtent = helpers.transformExtent,
    vecDist = helpers.vecDist,
    px = helpers.px;

function isKeyCode (event, kc) {
    return (kc === event.which || kc === event.keyCode);
}

function getStep (extent) {
    var width = extent.getWidth(),
        height = extent.getHeight(),
        diag = Math.sqrt((width*width) + (height*height));

    return (diag / 20);

}

function transformRegion (T, opt_extent) {
    var extent = opt_extent.extent;
    var NE = T.mapVec2([extent[2], extent[3]]);
    var SW = T.mapVec2([extent[0], extent[1]]);
    var newExtent = [SW[0], SW[1], NE[0], NE[1]];
    region.push(newExtent);
}


function NavigatorMode (nav) {
    this.navigator = nav;
}

NavigatorMode.prototype.getName = function () {
    return this.modeName;
};


NavigatorMode.prototype.keypress = function (event) {
    if (isKeyCode(event, 105)) { // i
        this.navigator.zoomIn();
    }
    else if (isKeyCode(event, 111)) { // o
        this.navigator.zoomOut();
    }
};


NavigatorMode.prototype.keyup = function (event) {
    if (isKeyCode(event, 38)) {
        this.navigator.south();
    }
    else if (isKeyCode(event, 40)) {
        this.navigator.north();
    }
    else if (isKeyCode(event, 37)) {
        this.navigator.east();
    }
    else if (isKeyCode(event, 39)) {
        this.navigator.west();
    }
};

NavigatorMode.prototype.getMouseEventPos = function (ev) {
    if (ev instanceof MouseEvent) {
        var target = ev.target,
            trect = target.getBoundingClientRect(),
            node = this.navigator.getNode(),
            nrect = node.getBoundingClientRect();
        return [
            ev.clientX - (nrect.left - trect.left),
            ev.clientY - (nrect.top - trect.top)
        ];
    }
    return [0, 0];
};

function NavigatorModeBase () {
    NavigatorMode.apply(this, arguments);
    this.modeName = 'ModeBase';

    semaphore.on('region:change', function () {
        if (this.isActive) {
            this.navigator.draw();
        }
    }, this);
}
util.inherits(NavigatorModeBase, NavigatorMode);

NavigatorModeBase.prototype.enter = function () {
    this.navigator.draw();
    this.isActive = true;
};

NavigatorModeBase.prototype.exit = function () {
    this.navigator.clear();
    this.isActive = true;
};



NavigatorModeBase.prototype.wheel = function (event) {
    if (Math.abs(event.deltaY) > 2) {
        if (event.deltaY < 0) {
            this.navigator.zoomIn();
        }
        else {
            this.navigator.zoomOut();
        }
    }
};


NavigatorModeBase.prototype.mousedown = function (event) {
    event.preventDefault();
    event.stopPropagation();
    this.startPoint = this.getMouseEventPos(event);
    this.isStarted = true;
    this.isPanning = !event.shiftKey;
};


NavigatorModeBase.prototype.drawPanControl = function (hp) {
    var sp = this.startPoint,
        extent = new Geometry.Extent(sp.concat(hp)),
        ctx = this.navigator.context;
    extent.normalize();
    var tl = extent.getBottomLeft().getCoordinates();
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.save();
    ctx.strokeStyle = '#0092FF';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sp[0], sp[1]);
    ctx.lineTo(hp[0], hp[1]);

    var tr0 = new Transform(),
        tr1 = new Transform(),
        mpX = sp[0] + ((hp[0] - sp[0]) * 0.9),
        mpY = sp[1] + ((hp[1] - sp[1]) * 0.9),
        mp0 = [mpX, mpY],
        mp1 = [mpX, mpY];

    tr0.rotate(60, hp);
    tr1.rotate(-60, hp);
    tr0.mapVec2(mp0);
    tr1.mapVec2(mp1);

    ctx.lineTo(mp0[0], mp0[1]);
    ctx.lineTo(mp1[0], mp1[1]);
    ctx.lineTo(hp[0], hp[1]);

    ctx.stroke();
    ctx.restore();
};

NavigatorModeBase.prototype.drawZoomControl = function (hp) {
    var sp = this.startPoint,
        extent = new Geometry.Extent(sp.concat(hp)),
        ctx = this.navigator.context;
    extent.normalize();
    var tl = extent.getBottomLeft().getCoordinates();
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.save();
    ctx.strokeStyle = '#0092FF';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sp[0], sp[1]);
    ctx.lineTo(hp[0], sp[1]);
    ctx.lineTo(hp[0], hp[1]);
    ctx.lineTo(sp[0], hp[1]);
    ctx.lineTo(sp[0], sp[1]);
    ctx.stroke();
    ctx.restore();
};

NavigatorModeBase.prototype.mousemove = function (event) {
    if (this.isStarted) {
        if (this.isPanning) {
            this.drawPanControl(this.getMouseEventPos(event));
        }
        else {
            this.drawZoomControl(this.getMouseEventPos(event));
        }
        if (!this.isMoving) {
            this.isMoving = true;
        }

    }
};

NavigatorModeBase.prototype.mouseup = function (event) {
    if (this.isStarted) {
        var endPoint = this.getMouseEventPos(event),
            startPoint = this.startPoint,
            dist = vecDist(startPoint, endPoint),
            map = this.navigator.map,
            ctx = this.navigator.context;

        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        if (dist > 4) {
            var startCoordinates = map.getCoordinateFromPixel(startPoint),
                endCoordinates = map.getCoordinateFromPixel(endPoint);
            if (this.isPanning) {
                var T = new Transform(),
                    extent = region.get();
                T.translate(startCoordinates[0] - endCoordinates[0],
                            startCoordinates[1] - endCoordinates[1]);
                transformRegion(T, extent);
            }
            else {
                var extent = new Geometry.Extent(
                        startCoordinates.concat(endCoordinates)
                    );
                region.push(extent);
            }
        }
        else {
            this.navigator.centerOn(startPoint);
        }
        this.isStarted = false;
        this.isZooming = false;
        this.isMoving = false;
        this.navigator.draw();
    }
};


var NAVIGATOR_MODES = [
    NavigatorModeBase,
];


function Navigator (options) {
    this.options = options;
    this.setupModes();
    this.setupCanvas();
    // this.setupButtons();
    this.map = options.map;
    var view = options.view;

    Object.defineProperty(this, 'transform', {
        get: function () {
            return view.transform.clone();
        }
    });
}
Navigator.prototype.events = [
    'click', 'dblclick',
    'mousedown', 'mousemove', 'mouseup',
    'keypress', 'keydown', 'keyup',
    'wheel'
    ];

Navigator.prototype.setupButtons = function () {
    var container = this.options.container,
        buttonBlock = document.createElement('div');

    buttonBlock.setAttribute('class', 'navigate-buttons');

    var zoomIn = makeButton('+', {
        'class': 'navigate-button navigate-zoom-in',
        'title': '[i]'
        }, this.zoomIn, this);

    var zoomOut = makeButton('-', {
        'class': 'navigate-button navigate-zoom-out',
        'title': '[o]'
    }, this.zoomOut, this);

    var west = makeButton('', {
        'class': 'navigate-button navigate-west icon-pan-west'
    }, this.west, this);

    var east = makeButton('', {
        'class': 'navigate-button navigate-east icon-pan-east'
    }, this.east, this);

    var north = makeButton('', {
        'class': 'navigate-button navigate-north icon-pan-north'
    }, this.north, this);

    var south = makeButton('', {
        'class': 'navigate-button navigate-south icon-pan-south'
    }, this.south, this);


    buttonBlock.appendChild(zoomIn);
    buttonBlock.appendChild(zoomOut);
    buttonBlock.appendChild(north);
    buttonBlock.appendChild(east);
    buttonBlock.appendChild(south);
    buttonBlock.appendChild(west);

    container.appendChild(buttonBlock);
};

Navigator.prototype.setupCanvas = function () {
    var container = this.options.container;
        rect = container.getBoundingClientRect();

    this.canvas = document.createElement('canvas');
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    this.canvas.backgroundColor = 'transparent';
    this.canvas.style.position = 'absolute';
    this.canvas.style.willChange = 'transform';
    this.canvas.style.transform = 'translateZ(0)';
    this.canvas.style.top = 0;
    this.canvas.style.left = 0;

    container.appendChild(this.canvas);
    this.canvas.setAttribute('tabindex', -1);
    // this.canvas.focus();
    this.context = this.canvas.getContext('2d');

    var dispatcher = _.bind(this.dispatcher, this);
    for (var i = 0; i < this.events.length; i++) {
        this.canvas.addEventListener(this.events[i], dispatcher, false);
    }
};


Navigator.prototype.resize = function () {
    var container = this.options.container;
        rect = container.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    this.draw();
};

Navigator.prototype.getNode = function () {
    return this.canvas;
};

Navigator.prototype.setupModes = function () {
    for (var i = 0; i < NAVIGATOR_MODES.length; i++) {
        this.createMode(NAVIGATOR_MODES[i]);
    }
};

Navigator.prototype.clear = function () {
    var rect = this.canvas.getBoundingClientRect();
    this.context.clearRect(0, 0, rect.width, rect.height);
};

Navigator.prototype.start = function () {
    this.isStarted = true;
    this.setMode('ModeBase');
    this.draw();
};

Navigator.prototype.end = function () {
    this.ender();
};


Navigator.prototype.drawScale = function () {
    var ctx = this.context,
        rect = this.canvas.getBoundingClientRect(),
        extent = region.get(),
        bl = extent.getBottomLeft().getCoordinates(),
        tr = extent.getTopRight().getCoordinates(),
        centerLatLong = extent.getCenter().getCoordinates(),
        center;

    bl = Proj3857.forward(bl);
    tr = Proj3857.forward(tr);
    center = Proj3857.forward(centerLatLong);
    this.transform.mapVec2(bl);
    this.transform.mapVec2(tr);
    this.transform.mapVec2(center);

    var rightOffset = 64,
        scaleWidth = 74,
        right = rect.width - rightOffset,
        left = rect.width - (scaleWidth + rightOffset),
        top = rect.height - 17,
        thickness = 6,
        bottom = top + thickness,
        length = right - left,
        hw = ((length - 1) / 2) + left,
        leftVec = this.map.getCoordinateFromPixel([left, top]),
        rightVec = this.map.getCoordinateFromPixel([right, top]),
        dist = turf.distance(turf.point(leftVec), turf.point(rightVec), 'kilometers') * 100000; // centimeters

    var formatNumber = function (n) {
        return Math.ceil(n);
        // if (Math.floor(n) === n) {
        //     return n;
        // }
        // return n.toFixed(2);
    };

    var labelRight, labelCenter;
    if (dist < 100) {
        labelRight = formatNumber(dist) + ' cm';
        labelCenter = formatNumber(dist/2) + ' cm';
    }
    else if (dist < 100000) {
        labelRight = formatNumber(dist / 100) + ' m';
        labelCenter = formatNumber((dist/2)/100) + ' m';
    }
    else {
        labelRight = formatNumber(dist / 100000) + ' km';
        labelCenter = formatNumber((dist/2) / 100000) + ' km';
    }

    // adjust scale size to fit dispayed size
    var distDiff = Math.ceil(dist) / dist;
    left = rect.width - ((scaleWidth * distDiff) + rightOffset);

    ctx.save();
    ctx.fillStyle = 'black';
    ctx.font = '11px sansguiltmb';
    ctx.textAlign = 'left';
    // ctx.fillText('0', left, top - 8);
    // ctx.fillText(labelCenter, hw, top - 4);
    ctx.fillText(labelRight, right + 5, top + thickness);
    ctx.restore();

    ctx.save();
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.fillRect(left, top, right - left, thickness);
    ctx.restore();

    ctx.save();
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.fillRect(left + 1, top + 1, (length / 2) - 1, (thickness / 2) - 1);
    ctx.fillRect(hw + 1, top + (thickness / 2), (length / 2) - 1, (thickness / 2) - 1);
    ctx.restore();
};

Navigator.prototype.draw = function (selected) {
    this.clear();
    this.drawScale();
    return this;
};

Navigator.prototype.createMode = function (proto) {
    if (!this.modes) {
        this.modes = {};
    }

    var mode = new proto(this),
        modeName = mode.getName();

    this.modes[modeName] = mode;
    return this;
};

Navigator.prototype.setMode = function (modeName) {
    if (this.currentMode) {
        var oldMode = this.getMode();
        if (oldMode.exit) {
            oldMode.exit();
        }
    }
    this.currentMode = modeName;
    if (this.modeButtons) {
        for (var mb in this.modeButtons) {
            this.modeButtons[mb].setAttribute('class', 'trace-button');
        }
        this.modeButtons[modeName].setAttribute('class', 'trace-button active');
    }
    var mode = this.getMode();
    if (mode.enter) {
        mode.enter();
    }
    return this;
};


Navigator.prototype.getMode = function () {
    return this.modes[this.currentMode];
};

Navigator.prototype.dispatcher = function (event) {
    event.preventDefault();
    event.stopPropagation();
    var type = event.type,
        mode = this.getMode();

    if (mode && (type in mode)) {
        mode[type](event);
    }
};

Navigator.prototype.zoomIn = function () {
    var extent = region.get(),
        val = getStep(extent);
    region.push(extent.buffer(-val));
};

Navigator.prototype.zoomOut = function () {
    var extent = region.get(),
        val = getStep(extent);
    region.push(extent.buffer(val));
};


Navigator.prototype.north = function () {
    var T = new Transform(),
        extent = region.get(),
        val = getStep(extent);

    T.translate(0, -val);
    transformRegion(T, extent);
};

Navigator.prototype.south = function () {
    var T = new Transform(),
        extent = region.get(),
        val = getStep(extent);

    T.translate(0, val);
    transformRegion(T, extent);
};

Navigator.prototype.east = function () {
    var T = new Transform(),
        extent = region.get(),
        val = getStep(extent);

    T.translate(-val, 0);
    transformRegion(T, extent);
};

Navigator.prototype.west = function () {
    var T = new Transform(),
        extent = region.get(),
        val = getStep(extent);

    T.translate(val, 0);
    transformRegion(T, extent);
};

Navigator.prototype.centerOn = function (pix) {
    var coords = this.map.getCoordinateFromPixel(pix),
        T = new Transform(),
        extent = region.get(),
        center = extent.getCenter().getCoordinates();

    T.translate(coords[0] - center[0], coords[1] - center[1]);
    transformRegion(T, extent);
};


module.exports = exports = Navigator;
