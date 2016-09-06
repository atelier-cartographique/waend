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

import _ from 'underscore';
import rbush from 'rbush';
import Projection from 'proj4';
import Geometry from '../Geometry';
import semaphore from '../Semaphore';
import debug from 'debug';
const logger = debug('waend:command/trace');

const Proj3857 = Projection('EPSG:3857');

function addClass (elem, c) {
    const ecStr = elem.getAttribute('class');
    const ec = ecStr ? ecStr.split(' ') : [];
    ec.push(c);
    elem.setAttribute('class', _.uniq(ec).join(' '));
}

function removeClass (elem, c) {
    const ecStr = elem.getAttribute('class');
    const ec = ecStr ? ecStr.split(' ') : [];
    elem.setAttribute('class', _.without(ec, c).join(' '));
}

const polygonProject = coordinates => {
    for (let i = 0; i < coordinates.length; i++) {
        const ringLength = coordinates[i].length;
        for (let ii = 0; ii < ringLength; ii++) {
            coordinates[i][ii] = Proj3857.forward(coordinates[i][ii]);
        }
    }
    return coordinates;
};

const lineProject = coordinates => {
    for (let i = 0; i < coordinates.length; i++) {
        coordinates[i] = Proj3857.forward(coordinates[i]);
    }
    return coordinates;
};


const polygonUnproject = coordinates => {
    for (let i = 0; i < coordinates.length; i++) {
        const ringLength = coordinates[i].length;
        for (let ii = 0; ii < ringLength; ii++) {
            coordinates[i][ii] = Proj3857.inverse(coordinates[i][ii]);
        }
    }
    return coordinates;
};

const lineUnproject = coordinates => {
    for (let i = 0; i < coordinates.length; i++) {
        coordinates[i] = Proj3857.inverse(coordinates[i]);
    }
    return coordinates;
};


const polygonTransform = (T, coordinates) => {
    for (let i = 0; i < coordinates.length; i++) {
        const ringLength = coordinates[i].length;
        for (let ii = 0; ii < ringLength; ii++) {
            coordinates[i][ii] = T.mapVec2(coordinates[i][ii]);
        }
    }
    return coordinates;
};

const lineTransform = (T, coordinates) => {
    for (let i = 0; i < coordinates.length; i++) {
        coordinates[i] = T.mapVec2(coordinates[i]);
    }
    return coordinates;
};

const CONTROL_SZ = 8;
const CONTROL_HALF_SZ = CONTROL_SZ / 2;


function isKeyCode (event, kc) {
    return (kc === event.which || kc === event.keyCode);
}

class TracerMode {
    constructor(tracer) {
        this.tracer = tracer;
    }

    getName() {
        return this.modeName;
    }

    keypress(event) {
        if (isKeyCode(event, 101)) { // e
            this.tracer.setMode('EditPoint');
        }
        else if (isKeyCode(event, 110)) { // n
            this.tracer.setMode('NewPoint');
        }
    }

    keyup(event) {
        if (isKeyCode(event, 13)) { // enter
            this.tracer.end();
        }
        else if (isKeyCode(event, 27)) { // escape
            this.tracer.clear();
            this.tracer.end();
        }
    }

    getMouseEventPos(ev) {
        if (ev instanceof MouseEvent) {
            const target = ev.target;
            const trect = target.getBoundingClientRect();
            return [
                ev.clientX - trect.left,
                ev.clientY - trect.top
            ];
        }
        return [0, 0];
    }
}

class TracerModeNewPoint extends TracerMode{
    constructor() {
        super(...arguments);
        this.modeName = 'NewPoint';
        Object.defineProperty(this, 'inverse', {
            get() {
                return this.tracer.transform.inverse();
            }
        });
        // this.inverse = this.tracer.transform.inverse();
    }

    click(event) {
        const pos = this.inverse.mapVec2(this.getMouseEventPos(event));
        const selected = this.tracer.getControls(pos);
        if (('LineString' === this.tracer.geometryType)
            && (selected.length > 0)
            && (_.indexOf(selected, 0) >= 0)) {
            this.tracer.closeSegment();
            this.tracer.setMode('EditPoint');
        }
        else {
            this.tracer.addSegment(pos);
        }
    }

    mousemove(event) {
        if ('LineString' === this.tracer.geometryType) {
            const pos = this.inverse.mapVec2(this.getMouseEventPos(event));
            const selected = this.tracer.getControls(pos);
            if ((selected.length > 0) && (_.indexOf(selected, 0) >= 0)) {
                this.highlighted = true;
                this.tracer.draw([0]);
            }
            else if (this.highlighted) {
                this.highlighted = false;
                this.tracer.draw();
            }
        }
    }
}


class TracerModeEditPoint extends TracerMode {
    constructor() {
        super(...arguments);
        this.modeName = 'EditPoint';
        Object.defineProperty(this, 'inverse', {
            get() {
                return this.tracer.transform.inverse();
            }
        });
    }

    mousedown(event) {
        const controls = this.tracer.controls;
        const pos = this.inverse.mapVec2(this.getMouseEventPos(event));
        const selected = this.tracer.getControls(pos);

        this.currentSelection = selected;
        // this.startingPoint = pos;
        this.tracer.draw(selected);
    }

    mousemove(event) {
        if (this.currentSelection) {
            event.preventDefault();
            event.stopPropagation();
            const pos = this.inverse.mapVec2(this.getMouseEventPos(event));

            for (const index of this.currentSelection) {
                this.tracer.segments[index] = pos;
                if ((0 === index) && ('Polygon' === this.tracer.geometryType)) {
                    this.tracer.segments[this.tracer.segments.length - 1] = pos;
                }
            }

            this.tracer.draw(this.currentSelection);
        }
    }

    mouseup(event) {
        this.currentSelection = null;
        this.tracer.setControls();
        this.tracer.draw();
    }
}


const TRACER_MODES = [
    TracerModeNewPoint,
    TracerModeEditPoint
];

function makeButton (label, classSuffix, callback, ctx) {
    const button = document.createElement('div');
    const labelElement = document.createElement('span');

    classSuffix = classSuffix ? `-${classSuffix}` : '';
    button.setAttribute('class', `trace-button push${classSuffix}`);
    labelElement.setAttribute('class', 'trace-button-label');
    labelElement.innerHTML = label;

    if (callback) {
        button.addEventListener('click', event => {
            callback.call(ctx, event);
        }, false);
    }

    button.appendChild(labelElement);
    return button;
}

class Tracer {
    constructor(options) {
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
                const rect = view.getRect();
                this.canvas.width = rect.width;
                this.canvas.height = rect.height;
                this.canvas.style.top = `${rect.top}px`;
                this.canvas.style.left = `${rect.left}px`;
                this.draw();
            }
        }, this);
    }

    setupButtons() {
        const container = this.options.container;
        const buttonBlock = document.createElement('div');

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
    }

    setupCanvas() {
        const container = this.options.container;
        const view = this.view;
        const rect = view.getRect();

        this.canvas = document.createElement('canvas');
        this.canvas.setAttribute('class', 'tool-trace');
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        this.canvas.backgroundColor = 'rgba(256,256,256,0.5)';
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = `${rect.top}px`;
        this.canvas.style.left = `${rect.left}px`;

        container.appendChild(this.canvas);
        this.canvas.setAttribute('tabindex', -1);
        this.canvas.focus();
        this.context = this.canvas.getContext('2d');

        const dispatcher = _.bind(this.dispatcher, this);

        const events = [
            'click', 'dblclick',
            'mousedown', 'mousemove', 'mouseup',
            'keypress', 'keydown', 'keyup'
            ];

        for (let i = 0; i < events.length; i++) {
            this.canvas.addEventListener(events[i], dispatcher, false);
        }
    }

    getNode() {
        return this.canvas;
    }

    setupModes() {
        for (let i = 0; i < TRACER_MODES.length; i++) {
            this.createMode(TRACER_MODES[i]);
        }
    }

    createControl(pos, idx) {
        const scale = this.transform.getScale()[0];
        const chs = CONTROL_HALF_SZ / scale;
        this.controls.insert({
            minX: pos[0] - chs,
            minY: pos[1] - chs,
            maxX: pos[0] + chs,
            maxY: pos[1] + chs,
            index: idx
        });
    }

    clear() {
        this.segments = [];
        this.controls.clear();
    }

    getControls(pos) {
        const scale = this.transform.getScale()[0];
        const chs = CONTROL_HALF_SZ / scale;
        const rect = {
            minX: pos[0] - chs,
            minY: pos[1] - chs,
            maxX: pos[0] + chs,
            maxY: pos[1] + chs
        };

        const controls = this.controls.search(rect);
        const indices = [];
        for (let i = 0, li = controls.length; i < li; i++) {
            indices.push(controls[i].index);
        }

        return indices;
    }

    setControls() {
        this.controls.clear();
        for (let i = 0, li = this.segments.length; i < li; i++) {
            this.createControl(this.segments[i], i);
        }
    }

    loadLine(coordinates) {
        this.geometryType = 'LineString';
        this.segments = coordinates;
    }

    loadPolygon(coordinates) {
        this.geometryType = 'Polygon';
        this.segments = coordinates[0];
    }

    getGeometry() {
        const gt = this.geometryType;
        const coordinates = this.getSegments();

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
    }

    start(ender, geometry) {

        this.ender = ender;
        if (geometry) {
            const gt = geometry.getType();
            const coordinates = geometry.getCoordinates();
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

    }

    end() {
        const geom = this.getGeometry();
        this.ender(geom);
    }

    addSegment(pos) {
        this.segments.push(pos);
        this.setControls();
        this.draw();
    }

    closeSegment() {
        if ('Polygon' !== this.geometryType) {
            this.geometryType = 'Polygon';
            this.segments.push(this.segments[0]);
            this.draw();
        }
    }

    getSegments() {
        return JSON.parse(JSON.stringify(this.segments));
    }

    drawSegments(selected) {
        const points = this.getSegments();
        const context = this.context;
        lineTransform(this.transform, points);
        context.save();
        context.strokeStyle = '#337AFF';
        context.fillStyle = 'rgba(128,128,128,0.5)';
        context.lineWidth = 1;
        context.moveTo(points[0][0], points[0][1]);
        for (let i = 1, li = points.length; i < li; i++) {
            context.lineTo(points[i][0], points[i][1]);
        }
        context.stroke();
        if ('Polygon' === this.geometryType) {
            context.fill();
        }
        context.restore();
    }

    drawControls(selected) {
        const points = this.getSegments();
        const context = this.context;
        let vec;
        selected = selected || [];
        lineTransform(this.transform, points);
        context.save();
        context.strokeStyle = '#337AFF';
        context.fillStyle = 'white';
        context.lineWidth = 1;
        for (let i = 0, li = points.length; i < li; i++) {
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
    }

    draw(selected) {
        const rect = this.canvas.getBoundingClientRect();
        this.context.clearRect(0, 0, rect.width, rect.height);
        if (this.segments.length > 1) {
            this.drawSegments(selected);
        }
        if (this.segments.length > 0) {
            this.drawControls(selected);
        }
        return this;
    }

    createMode(proto) {
        if (!this.modes) {
            this.modes = {};
        }

        const mode = new proto(this);
        const modeName = mode.getName();

        this.modes[modeName] = mode;
        return this;
    }

    setMode(modeName) {
        this.currentMode = modeName;
        for (const mb in this.modeButtons) {
            removeClass(this.modeButtons[mb], 'active');
        }
        addClass(this.modeButtons[modeName], 'active');
        return this;
    }

    getMode() {
        return this.modes[this.currentMode];
    }

    dispatcher(event) {
        const type = event.type;
        const mode = this.getMode();

        if (type in mode) {
            mode[type](event);
        }
    }
}



function trace () {
    const self = this;
    const shell = self.shell;
    const stdout = shell.stdout;
    const terminal = shell.terminal;
    const env = shell.env;
    const map = env.map;
    const view = map.getView();
    const display = terminal.display();
    let geom;

    if (env.DELIVERED && (env.DELIVERED instanceof Geometry.Geometry)) {
        geom = env.DELIVERED;
    }

    const tracerOptions = {
        'container': display.node,
        'view': view,
    };

    const tracer = new Tracer(tracerOptions);

    const resolver = (resolve, reject) => {
        const ender = geom => {
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


export default {
    name: 'trace',
    command: trace
};
