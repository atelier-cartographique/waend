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
    Projection = require('proj4');

var Proj3857 = Projection('EPSG:3857');

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

var CONTROL_SZ = 4,
    CONTROL_HALF_SZ = CONTROL_SZ / 2;


function TracerMode (tracer) {
    this.tracer = tracer;
}

TracerMode.prototype.getName = function () {
    return this.modeName;
};

function TracerModeNewPoint () {
    TracerMode.apply(this, arguments);
    this.modeName = 'NewPoint';
    this.inverse = this.tracer.transform.inverse();
}
util.inherits(TracerModeNewPoint, TracerMode);

function TracerModeEditPoint () {
    TracerMode.apply(this, arguments);
    this.modeName = 'EditPoint';
}
util.inherits(TracerModeEditPoint, TracerMode);


TracerModeNewPoint.prototype.click = function (event) {
    var vec = [event.clientX, event.clientY];
    this.inverse.mapVec2(vec);
    this.tracer.addSegment(vec);
};


var TRACER_MODES = [
    TracerModeNewPoint,
    TracerModeEditPoint
];

function Tracer (options) {
    this.options = options;
    this.transform = options.transform;
    this.controls = rbush();
    this.segments = [];
    this.setupModes();
    this.setupCanvas();
}

Tracer.prototype.setupCanvas = function () {
    var container = this.options.container;
        rect = container.getBoundingClientRect();

    this.canvas = document.createElement('canvas');
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    this.canvas.backgroundColor = 'rgba(256,256,256,0.5)';
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';

    container.appendChild(this.canvas);
    this.context = this.canvas.getContext('2d');

    this.canvas.addEventListener('click', _.bind(this.dispatcher, this), false);
};

Tracer.prototype.setupModes = function () {
    for (var i = 0; i < TRACER_MODES.length; i++) {
        this.createMode(TRACER_MODES[i]);
    }
};

Tracer.prototype.createControl = function (pos, idx) {
    var item = [
        pos[0] - CONTROL_HALF_SZ, pos[1] - CONTROL_HALF_SZ,
        pos[0] + CONTROL_HALF_SZ, pos[1] + CONTROL_HALF_SZ,
        idx
    ];
    this.controls.insert(item);
};

Tracer.prototype.getSegments = function (idx) {
    if (0 === idx) {
        return [null, this.segments[0]];
    }
    else if ((this.segments.length - 1) == idx) {
        return [this.segments[idx], null];
    }
    else {
        return [this.segments[idx - 1], this.segments[idx]];
    }
};

Tracer.prototype.getControl = function (pos) {
    var rect = [
        pos[0] - CONTROL_HALF_SZ, pos[1] - CONTROL_HALF_SZ,
        pos[0] + CONTROL_HALF_SZ, pos[1] + CONTROL_HALF_SZ
    ];

    var controls = this.controls.search(rect);
    if (controls.length > 0) {
        return controls[0][4];
    }

    return null;
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
    // TODO
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

Tracer.prototype.getSegments = function () {
    return JSON.parse(JSON.stringify(this.segments));
};

Tracer.prototype.drawSegments = function () {
    var points = this.getSegments(),
        context = this.context;
    lineTransform(this.transform, points);
    context.save();
    context.strokeStyle = '#337AFF';
    context.lineWidth = 1;
    context.moveTo(points[0][0], points[0][1]);
    for (var i = 1, li = points.length; i < li; i++) {
        context.lineTo(points[i][0], points[i][1]);
    }
    context.stroke();
    context.restore();
};


Tracer.prototype.drawControls = function () {
    var points = this.getSegments(),
        context = this.context,
        vec;
    lineTransform(this.transform, points);
    context.save();
    context.strokeStyle = '#337AFF';
    context.fillStyle = 'white';
    context.lineWidth = 1;
    for (var i = 0, li = points.length; i < li; i++) {
        vec = points[i];
        context.beginPath();
        context.arc(vec[0], vec[1], CONTROL_HALF_SZ, 0, 2 * Math.PI, false);
        context.fill();
        context.stroke();
    }
    context.restore();
};

Tracer.prototype.draw = function () {
    var rect = this.canvas.getBoundingClientRect();
    this.context.clearRect(0, 0, rect.width, rect.height);
    if (this.segments.length > 1) {
        this.drawSegments();
    }
    if (this.segments.length > 0) {
        this.drawControls();
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
        map = shell.env.map,
        view = map.getView(),
        display = terminal.display();

    var tracerOptions = {
        'container': display.node,
        'transform': view.transform.clone(),
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
        tracer.start(ender);
    };

    return (new Promise(resolver));
}


module.exports = exports = {
    name: 'trace',
    command: trace
};
