/*
 * app/lib/commands/trace.js
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
    rbush = require('rbush'),
    Projection = require('proj4'),
    Geometry = require('../Geometry'),
    semaphore = require('../Semaphore');

var Proj3857 = Projection('EPSG:3857');

function addClass (elem, c) {
    var ecStr = elem.getAttribute('class');
    var ec = ecStr ? ecStr.split(' ') : [];
    ec.push(c);
    elem.setAttribute('class', _.uniq(ec).join(' '));
}

function removeClass (elem, c) {
    var ecStr = elem.getAttribute('class');
    var ec = ecStr ? ecStr.split(' ') : [];
    elem.setAttribute('class', _.without(ec, c).join(' '));
}

var polygonProject = function (coordinates) {
    for (var i = 0; i < coordinates.length; i++) {
        var ringLength = coordinates[i].length;
        for (var ii = 0; ii < ringLength; ii++) {
            coordinates[i][ii] = Proj3857.forward(coordinates[i][ii]);
        }
    }
    return coordinates;
};

var lineProject = function (coordinates) {
    for (var i = 0; i < coordinates.length; i++) {
        coordinates[i] = Proj3857.forward(coordinates[i]);
    }
    return coordinates;
};


var polygonUnproject = function (coordinates) {
    for (var i = 0; i < coordinates.length; i++) {
        var ringLength = coordinates[i].length;
        for (var ii = 0; ii < ringLength; ii++) {
            coordinates[i][ii] = Proj3857.inverse(coordinates[i][ii]);
        }
    }
    return coordinates;
};

var lineUnproject = function (coordinates) {
    for (var i = 0; i < coordinates.length; i++) {
        coordinates[i] = Proj3857.inverse(coordinates[i]);
    }
    return coordinates;
};


var polygonTransform = function (T, coordinates) {
    for (var i = 0; i < coordinates.length; i++) {
        var ringLength = coordinates[i].length;
        for (var ii = 0; ii < ringLength; ii++) {
            coordinates[i][ii] = T.mapVec2(coordinates[i][ii]);
        }
    }
    return coordinates;
};

var lineTransform = function (T, coordinates) {
    for (var i = 0; i < coordinates.length; i++) {
        coordinates[i] = T.mapVec2(coordinates[i]);
    }
    return coordinates;
};

var CONTROL_SZ = 8,
    CONTROL_HALF_SZ = CONTROL_SZ / 2;


function isKeyCode (event, kc) {
    return (kc === event.which || kc === event.keyCode);
}

function TracerMode (tracer) {
    this.tracer = tracer;
}

TracerMode.prototype.getName = function () {
    return this.modeName;
};


TracerMode.prototype.keypress = function (event) {
    if (isKeyCode(event, 101)) { // e
        this.tracer.setMode('EditPoint');
    }
    else if (isKeyCode(event, 110)) { // n
        this.tracer.setMode('NewPoint');
    }
};


TracerMode.prototype.keyup = function (event) {
    if (isKeyCode(event, 13)) { // enter
        this.tracer.end();
    }
    else if (isKeyCode(event, 27)) { // escape
        this.tracer.clear();
        this.tracer.end();
    }
};

TracerMode.prototype.getMouseEventPos = function (ev) {
    if (ev instanceof MouseEvent) {
        var target = ev.target,
            trect = target.getBoundingClientRect();
            return [
                ev.clientX - trect.left,
                ev.clientY - trect.top
            ];
    }
    return [0, 0];
}


function TracerModeNewPoint () {
    TracerMode.apply(this, arguments);
    this.modeName = 'NewPoint';
    Object.defineProperty(this, 'inverse', {
        get:  function () {
            return this.tracer.transform.inverse();
        }
    });
    // this.inverse = this.tracer.transform.inverse();
}
util.inherits(TracerModeNewPoint, TracerMode);

function TracerModeEditPoint () {
    TracerMode.apply(this, arguments);
    this.modeName = 'EditPoint';
    Object.defineProperty(this, 'inverse', {
        get: function () {
            return this.tracer.transform.inverse();
        }
    });
}
util.inherits(TracerModeEditPoint, TracerMode);


TracerModeNewPoint.prototype.click = function (event) {
    var pos = this.inverse.mapVec2(this.getMouseEventPos(event)),
        selected = this.tracer.getControls(pos);
    if (('LineString' === this.tracer.geometryType)
        && (selected.length > 0)
        && (_.indexOf(selected, 0) >= 0)) {
        this.tracer.closeSegment();
        this.tracer.setMode('EditPoint');
    }
    else {
        this.tracer.addSegment(pos);
    }
};


TracerModeNewPoint.prototype.mousemove = function (event) {
    if ('LineString' === this.tracer.geometryType) {
        var pos = this.inverse.mapVec2(this.getMouseEventPos(event)),
            selected = this.tracer.getControls(pos);
        if ((selected.length > 0) && (_.indexOf(selected, 0) >= 0)) {
            this.highlighted = true;
            this.tracer.draw([0]);
        }
        else if (this.highlighted) {
            this.highlighted = false;
            this.tracer.draw();
        }
    }
};

TracerModeEditPoint.prototype.mousedown = function (event) {
    var controls = this.tracer.controls,
        pos = this.inverse.mapVec2(this.getMouseEventPos(event)),
        selected = this.tracer.getControls(pos);

    this.currentSelection = selected;
    // this.startingPoint = pos;
    this.tracer.draw(selected);
};


TracerModeEditPoint.prototype.mousemove = function (event) {
    if (this.currentSelection) {
        event.preventDefault();
        event.stopPropagation();
        var pos = this.inverse.mapVec2(this.getMouseEventPos(event));
        for (var i = 0; i < this.currentSelection.length; i++) {
            var index = this.currentSelection[i];
            this.tracer.segments[index] = pos;
            if ((0 === index) && ('Polygon' === this.tracer.geometryType)) {
                this.tracer.segments[this.tracer.segments.length - 1] = pos;
            }
        }
        this.tracer.draw(this.currentSelection);
    }
};

TracerModeEditPoint.prototype.mouseup = function (event) {
    this.currentSelection = null;
    this.tracer.setControls();
    this.tracer.draw();
};

var TRACER_MODES = [
    TracerModeNewPoint,
    TracerModeEditPoint
];

function makeButton (label, classSuffix, callback, ctx) {
    var button = document.createElement('div'),
        labelElement = document.createElement('span');

    classSuffix = classSuffix ? '-' + classSuffix : '';
    button.setAttribute('class', 'trace-button push' + classSuffix);
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

function Tracer (options) {
    this.options = options;
    this.view = options.view;
    this.transform = this.view.transform.clone();
    this.controls = rbush();
    this.segments = [];
    this.setupModes();
    this.setupCanvas();
    this.setupButtons();

    semaphore.on('view:resize', function (view) {
        this.transform = view.transform.clone();
        if (this.canvas) {
            var rect = view.getRect();
            this.canvas.width = rect.width;
            this.canvas.height = rect.height;
            this.canvas.style.top = rect.top + 'px';
            this.canvas.style.left = rect.left + 'px';
            this.draw();
        }
    }, this);
}


Tracer.prototype.setupButtons = function () {
    var container = this.options.container,
        buttonBlock = document.createElement('div');

    addClass(buttonBlock, 'trace-buttons');
    buttonBlock.appendChild(makeButton('Validate', 'validate', function(){
        this.end();
    }, this));
    buttonBlock.appendChild(makeButton('Cancel', 'cancel', function(){
        this.clear();
        this.end();
    }, this));

    this.modeButtons = {
        'NewPoint': makeButton('Add point', 'add', function(){
            this.setMode('NewPoint');
        }, this),

        'EditPoint': makeButton('Edit', 'edit', function(){
            this.setMode('EditPoint');
        }, this)
    };

    buttonBlock.appendChild(this.modeButtons.NewPoint);
    buttonBlock.appendChild(this.modeButtons.EditPoint);

    container.appendChild(buttonBlock);
};

Tracer.prototype.setupCanvas = function () {
    var container = this.options.container,
        view = this.view,
        rect = view.getRect();

    this.canvas = document.createElement('canvas');
    this.canvas.setAttribute('class', 'tool-trace');
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    this.canvas.backgroundColor = 'rgba(256,256,256,0.5)';
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = rect.top + 'px';
    this.canvas.style.left = rect.left + 'px';

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

Tracer.prototype.getNode = function () {
    return this.canvas;
};

Tracer.prototype.setupModes = function () {
    for (var i = 0; i < TRACER_MODES.length; i++) {
        this.createMode(TRACER_MODES[i]);
    }
};

Tracer.prototype.createControl = function (pos, idx) {
    var scale = this.transform.getScale()[0],
        chs = CONTROL_HALF_SZ / scale;
    this.controls.insert({
        minX: pos[0] - chs,
        minY: pos[1] - chs,
        maxX: pos[0] + chs,
        maxY: pos[1] + chs,
        index: idx
    });
};

Tracer.prototype.clear = function () {
    this.segments = [];
    this.controls.clear();
};

Tracer.prototype.getControls = function (pos) {
    var scale = this.transform.getScale()[0],
        chs = CONTROL_HALF_SZ / scale;
    var rect = {
        minX: pos[0] - chs,
        minY: pos[1] - chs,
        maxX: pos[0] + chs,
        maxY: pos[1] + chs
    };

    var controls = this.controls.search(rect),
        indices = [];
    for (var i = 0, li = controls.length; i < li; i++) {
        indices.push(controls[i].index);
    }

    return indices;
};

Tracer.prototype.setControls = function () {
    this.controls.clear();
    for (var i = 0, li = this.segments.length; i < li; i++) {
        this.createControl(this.segments[i], i);
    }
};

Tracer.prototype.loadLine = function (coordinates) {
    this.geometryType = 'LineString';
    this.segments = coordinates;
};

Tracer.prototype.loadPolygon = function (coordinates) {
    this.geometryType = 'Polygon';
    this.segments = coordinates[0];
};

Tracer.prototype.getGeometry = function () {
    var gt = this.geometryType,
        coordinates = this.getSegments();

    if ('LineString' === gt) {
        if (coordinates.length > 1) {
            lineUnproject(coordinates);
            return (new Geometry.LineString(coordinates));
        }
    }
    else if ('Polygon' === gt) {
        if (coordinates.length > 3) {
            polygonUnproject([coordinates]);
            return (new Geometry.Polygon([coordinates]));
        }
    }

    return null;
};

Tracer.prototype.start = function (ender, geometry) {

    this.ender = ender;
    if (geometry) {
        var gt = geometry.getType(),
            coordinates = geometry.getCoordinates();
        if ( 'LineString' === gt) {
            lineProject(coordinates);
            this.loadLine(coordinates);
        }
        else if ('Polygon' === gt) {
            polygonProject(coordinates);
            this.loadPolygon(coordinates);
        }

        this.setControls();
        this.draw();
        this.setMode('EditPoint');
    }
    else {
        this.geometryType = 'LineString';
        this.setMode('NewPoint');
    }

};

Tracer.prototype.end = function () {
    var geom = this.getGeometry();
    this.ender(geom);
};

Tracer.prototype.addSegment = function (pos) {
    this.segments.push(pos);
    this.setControls();
    this.draw();
};

Tracer.prototype.closeSegment = function () {
    if ('Polygon' !== this.geometryType) {
        this.geometryType = 'Polygon';
        this.segments.push(this.segments[0]);
        this.draw();
    }
};

Tracer.prototype.getSegments = function () {
    return JSON.parse(JSON.stringify(this.segments));
};

Tracer.prototype.drawSegments = function (selected) {
    var points = this.getSegments(),
        context = this.context;
    lineTransform(this.transform, points);
    context.save();
    context.strokeStyle = '#337AFF';
    context.fillStyle = 'rgba(128,128,128,0.5)';
    context.lineWidth = 1;
    context.moveTo(points[0][0], points[0][1]);
    for (var i = 1, li = points.length; i < li; i++) {
        context.lineTo(points[i][0], points[i][1]);
    }
    context.stroke();
    if ('Polygon' === this.geometryType) {
        context.fill();
    }
    context.restore();
};


Tracer.prototype.drawControls = function (selected) {
    var points = this.getSegments(),
        context = this.context,
        vec;
    selected = selected || [];
    lineTransform(this.transform, points);
    context.save();
    context.strokeStyle = '#337AFF';
    context.fillStyle = 'white';
    context.lineWidth = 1;
    for (var i = 0, li = points.length; i < li; i++) {
        vec = points[i];
        context.beginPath();
        if (_.indexOf(selected, i) < 0) {
            context.arc(vec[0], vec[1], CONTROL_HALF_SZ, 0, 2 * Math.PI, false);
            context.fill();
            context.stroke();
        }
        else {
            context.save();
            context.strokeStyle = '#D60111';
            context.fillStyle = 'white';
            context.lineWidth = 1;
            context.arc(vec[0], vec[1], CONTROL_HALF_SZ, 0, 2 * Math.PI, false);
            context.fill();
            context.stroke();
            context.restore();
        }
    }
    context.restore();
};

Tracer.prototype.draw = function (selected) {
    var rect = this.canvas.getBoundingClientRect();
    this.context.clearRect(0, 0, rect.width, rect.height);
    if (this.segments.length > 1) {
        this.drawSegments(selected);
    }
    if (this.segments.length > 0) {
        this.drawControls(selected);
    }
    return this;
};

Tracer.prototype.createMode = function (proto) {
    if (!this.modes) {
        this.modes = {};
    }

    var mode = new proto(this),
        modeName = mode.getName();

    this.modes[modeName] = mode;
    return this;
};

Tracer.prototype.setMode = function (modeName) {
    this.currentMode = modeName;
    for (var mb in this.modeButtons) {
        removeClass(this.modeButtons[mb], 'active');
    }
    addClass(this.modeButtons[modeName], 'active');
    return this;
};


Tracer.prototype.getMode = function () {
    return this.modes[this.currentMode];
};

Tracer.prototype.dispatcher = function (event) {
    var type = event.type,
        mode = this.getMode();

    if (type in mode) {
        mode[type](event);
    }
};



function trace () {
    var self = this,
        shell = self.shell,
        stdout = shell.stdout,
        terminal = shell.terminal,
        env = shell.env,
        map = env.map,
        view = map.getView(),
        display = terminal.display(),
        geom;

    if (env.DELIVERED && (env.DELIVERED instanceof Geometry.Geometry)) {
        geom = env.DELIVERED;
    }

    var tracerOptions = {
        'container': display.node,
        'view': view,
    };

    var tracer = new Tracer(tracerOptions);

    var resolver = function (resolve, reject) {
        var ender = function (geom) {
            display.end();
            if (geom) {
                resolve(geom);
            }
            else {
                reject('NoGeometry');
            }
        };
        tracer.start(ender, geom);
    };

    return (new Promise(resolver));
}


module.exports = exports = {
    name: 'trace',
    command: trace
};
