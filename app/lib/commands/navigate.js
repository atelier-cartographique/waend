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
    region = require('../Region');


var Proj3857 = Projection('EPSG:3857');



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


function NavigatorModeBase () {
    NavigatorMode.apply(this, arguments);
    this.modeName = 'ModeBase';
}
util.inherits(NavigatorModeBase, NavigatorMode);

var NAVIGATOR_MODES = [
    NavigatorModeBase,
];

function makeButton (label, callback, ctx) {
    var button = document.createElement('div'),
        labelElement = document.createElement('span');
    button.setAttribute('class', 'trace-button');
    labelElement.setAttribute('class', 'trace-button-label');
    labelElement.innerHTML = label;

    if (callback) {
        button.addEventListener('click', function(event){
            callback.call(ctx, event);
        }, false);
    }

    button.appendChild(labelElement);
    return button;
}


function Navigator (options) {
    this.options = options;
    this.transform = options.transform;
    this.setupModes();
    this.setupCanvas();
    this.setupButtons();
}


Navigator.prototype.setupButtons = function () {

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
            'keypress', 'keydown', 'keyup'
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

};

Navigator.prototype.start = function (ender) {
    this.ender = ender;
    this.setMode('ModeBase');
};

Navigator.prototype.end = function () {
    this.ender();
};

Navigator.prototype.draw = function (selected) {
    var rect = this.canvas.getBoundingClientRect();
    this.context.clearRect(0, 0, rect.width, rect.height);
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
    this.currentMode = modeName;
    if (this.modeButtons) {
        for (var mb in this.modeButtons) {
            this.modeButtons[mb].setAttribute('class', 'trace-button');
        }
        this.modeButtons[modeName].setAttribute('class', 'trace-button active');
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

    var newExtent = extent.buffer(-val);
    region.push(newExtent);
};

Navigator.prototype.zoomOut = function () {
    var extent = region.get(),
        val = getStep(extent);

    var newExtent = extent.buffer(val);
    region.push(newExtent);
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





function navigate () {
    var self = this,
        shell = self.shell,
        stdout = shell.stdout,
        terminal = shell.terminal,
        map = shell.env.map,
        view = map.getView(),
        display = terminal.display();

    var options = {
        'container': display.node,
        'transform': view.transform.clone()
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
