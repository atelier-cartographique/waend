/*
 * app/lib/commands/navigate.js
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
    Geometry = require('../Geometry'),
    Transform = require('../Transform'),
    Projection = require('proj4'),
    region = require('../Region'),
    semaphore = require('../Semaphore'),
    turf = require('turf');


var Proj3857 = Projection('EPSG:3857');

function projectExtent (extent) {
    var min = Proj3857.forward(extent.slice(0,2)),
        max = Proj3857.forward(extent.slice(2));
    return min.concat(max);
}

function unprojectExtent (extent) {
    var min = Proj3857.inverse(extent.slice(0,2)),
        max = Proj3857.inverse(extent.slice(2));
    return min.concat(max);
}

function transformExtent (extent, T) {
    var min = extent.slice(0,2),
        max = extent.slice(2);
    T.mapVec2(min);
    T.mapVec2(max);
    return min.concat(max);
}



function isKeyCode (event, kc) {
    return (kc === event.which || kc === event.keyCode);
}

function getStep (extent) {
    var width = extent.getWidth(),
        height = extent.getHeight(),
        diag = Math.sqrt((width*width) + (height*height));

    return (diag / 10);

}

function transformRegion (T, opt_extent) {
    var extent = opt_extent.extent;
    var NE = T.mapVec2([extent[2], extent[3]]);
    var SW = T.mapVec2([extent[0], extent[1]]);
    var newExtent = [SW[0], SW[1], NE[0], NE[1]];
    region.push(newExtent);
}

function makeButton (label, attrs, callback, ctx) {
    var button = document.createElement('div'),
        labelElement = document.createElement('span');
    labelElement.setAttribute('class', 'label');
    labelElement.innerHTML = label;

    _.each(attrs, function (val, k) {
        button.setAttribute(k, val);
    });

    if (callback) {
        button.addEventListener('click', function(event){
            callback.call(ctx, event);
        }, false);
    }

    button.appendChild(labelElement);
    return button;
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
    if (isKeyCode(event, 27)) { // escape
        this.navigator.end();
    }
    else if (isKeyCode(event, 38)) {
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

NavigatorModeBase.prototype.click = function (event) {
    this.navigator.centerOn([event.clientX, event.clientY]);
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

var NAVIGATOR_MODES = [
    NavigatorModeBase,
];


function Navigator (options) {
    this.options = options;
    this.setupModes();
    this.setupCanvas();
    this.setupButtons();
    this.map = options.map;

    var view = options.map.getView();

    Object.defineProperty(this, 'transform', {
        get: function () {
            return view.transform.clone();
        }
    });
}


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

    var west = makeButton('↦', {
        'class': 'navigate-button navigate-west'
    }, this.west, this);

    var east = makeButton('↤', {
        'class': 'navigate-button navigate-east'
    }, this.east, this);

    var north = makeButton('↧', {
        'class': 'navigate-button navigate-north'
    }, this.north, this);

    var south = makeButton('↥', {
        'class': 'navigate-button navigate-south'
    }, this.south, this);

    var exit = makeButton('exit', {
        'class': 'navigate-button navigate-exit',
        'title': 'escape'
    }, this.end, this);


    buttonBlock.appendChild(zoomIn);
    buttonBlock.appendChild(zoomOut);
    buttonBlock.appendChild(north);
    buttonBlock.appendChild(east);
    buttonBlock.appendChild(south);
    buttonBlock.appendChild(west);
    buttonBlock.appendChild(exit);

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
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';

    container.appendChild(this.canvas);
    this.canvas.setAttribute('tabindex', -1);
    this.canvas.focus();
    this.context = this.canvas.getContext('2d');

    var dispatcher = _.bind(this.dispatcher, this),
        events = [
            'click', 'dblclick',
            'mousedown', 'mousemove', 'mouseup',
            'keypress', 'keydown', 'keyup',
            'wheel'
            ];
    for (var i = 0; i < events.length; i++) {
        this.canvas.addEventListener(events[i], dispatcher, false);
    }
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

Navigator.prototype.start = function (ender) {
    this.ender = ender;
    this.setMode('ModeBase');
};

Navigator.prototype.end = function () {
    this.ender();
};

Navigator.prototype.drawRegion = function () {
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

    ctx.save();
    ctx.setLineDash([4, 16]);
    ctx.strokeStyle = '#337AFF';
    ctx.fillStyle = '#888';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bl[0], bl[1]);
    ctx.lineTo(bl[0], tr[1]);
    ctx.lineTo(tr[0], tr[1]);
    ctx.lineTo(tr[0], bl[1]);
    ctx.lineTo(bl[0], bl[1]);
    // ctx.lineTo(-2, rect.height + 2);
    // ctx.lineTo(rect.width + 2, rect.height + 2);
    // ctx.lineTo(rect.width + 2, -2);
    // ctx.lineTo(-2, -2);
    // ctx.lineTo(-2, rect.height + 2);
    ctx.stroke();
    // ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = '#337AFF';
    ctx.fillStyle = '#337AFF';
    ctx.lineWidth = 2;
    ctx.font = '16px monospace';
    ctx.beginPath();
    ctx.moveTo(center[0], -2);
    ctx.lineTo(center[0], rect.height + 2);
    ctx.stroke();
    ctx.moveTo(-2, center[1]);
    ctx.lineTo(rect.width + 2, center[1]);
    ctx.stroke();
    ctx.fillText(Geometry.toDMS(centerLatLong), 4 , center[1] - 4);
    ctx.save();
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

    var hw = rect.width / 2,
        left = rect.width * 0.25,
        right = rect.width * 0.75,
        top = rect.height - 128,
        bottom = top + 64,
        leftVec = this.map.getCoordinateFromPixel([left, top]),
        rightVec = this.map.getCoordinateFromPixel([right, top]),
        dist = turf.distance(turf.point(leftVec), turf.point(rightVec), 'kilometers') * 100000; // centimeters

    var formatNumber = function (n) {
        if (Math.floor(n) === n) {
            return n;
        }
        return n.toFixed(2);
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

    ctx.save();
    ctx.fillStyle = 'black';
    ctx.font = '16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('0', left, top - 4);
    ctx.fillText(labelCenter, hw, top - 4);
    ctx.fillText(labelRight, right, top - 4);
    ctx.restore();

    ctx.save();
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.fillRect(left, top, hw, 64);
    ctx.restore();

    ctx.save();
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.fillRect(left + 1, top + 1, hw /2, 31);
    ctx.fillRect(hw, top + 32, hw/2, 31);
    ctx.restore();
};

Navigator.prototype.draw = function (selected) {
    this.clear();
    this.drawRegion();
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
    var type = event.type,
        mode = this.getMode();

    if (type in mode) {
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




function navigate () {
    var self = this,
        shell = self.shell,
        stdout = shell.stdout,
        terminal = shell.terminal,
        map = shell.env.map,
        display = terminal.display();

    var options = {
        'container': display.node,
        'map': map
    };

    var nav = new Navigator(options);

    var resolver = function (resolve, reject) {

        var ender = function (extent) {
            display.end();
            resolve(extent);
        };

        nav.start(ender);
    };

    return (new Promise(resolver));
}


module.exports = exports = {
    name: 'navigate',
    command: navigate
};
