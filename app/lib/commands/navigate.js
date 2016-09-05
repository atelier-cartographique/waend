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

import _ from 'underscore';

import util from 'util';
import Promise from 'bluebird';
import Geometry from '../Geometry';
import Transform from '../Transform';
import Projection from 'proj4';
import region from '../Region';
import semaphore from '../Semaphore';
import turf from 'turf';


const Proj3857 = Projection('EPSG:3857');

function projectExtent (extent) {
    const min = Proj3857.forward(extent.slice(0,2));
    const max = Proj3857.forward(extent.slice(2));
    return min.concat(max);
}

function unprojectExtent (extent) {
    const min = Proj3857.inverse(extent.slice(0,2));
    const max = Proj3857.inverse(extent.slice(2));
    return min.concat(max);
}

function transformExtent (extent, T) {
    const min = extent.slice(0,2);
    const max = extent.slice(2);
    T.mapVec2(min);
    T.mapVec2(max);
    return min.concat(max);
}

function vecDist (v1, v2) {
    const dx = v2[0] - v1[0];
    const dy = v2[1] - v1[1];
    return Math.sqrt((dx*dx) + (dy*dy));
}


function isKeyCode (event, kc) {
    return (kc === event.which || kc === event.keyCode);
}

function getStep (extent) {
    const width = extent.getWidth();
    const height = extent.getHeight();
    const diag = Math.sqrt((width*width) + (height*height));

    return (diag / 10);
}

function transformRegion (T, opt_extent) {
    const extent = opt_extent.extent;
    const NE = T.mapVec2([extent[2], extent[3]]);
    const SW = T.mapVec2([extent[0], extent[1]]);
    const newExtent = [SW[0], SW[1], NE[0], NE[1]];
    region.push(newExtent);
}

function makeButton (label, attrs, callback, ctx) {
    const button = document.createElement('div');
    const labelElement = document.createElement('span');
    labelElement.setAttribute('class', 'label');
    labelElement.innerHTML = label;

    _.each(attrs, (val, k) => {
        button.setAttribute(k, val);
    });

    if (callback) {
        button.addEventListener('click', event => {
            callback.call(ctx, event);
        }, false);
    }

    button.appendChild(labelElement);
    return button;
}


class NavigatorMode {
    constructor(nav) {
        this.navigator = nav;
    }

    getName() {
        return this.modeName;
    }

    keypress(event) {
        if (isKeyCode(event, 105)) { // i
            this.navigator.zoomIn();
        }
        else if (isKeyCode(event, 111)) { // o
            this.navigator.zoomOut();
        }
    }

    keyup(event) {
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
    }
}

class NavigatorModeBase {
    constructor() {
        NavigatorMode.apply(this, arguments);
        this.modeName = 'ModeBase';

        semaphore.on('region:change', function () {
            if (this.isActive) {
                this.navigator.draw();
            }
        }, this);
    }

    enter() {
        this.navigator.draw();
        this.isActive = true;
    }

    exit() {
        this.navigator.clear();
        this.isActive = true;
    }

    wheel(event) {
        if (Math.abs(event.deltaY) > 2) {
            if (event.deltaY < 0) {
                this.navigator.zoomIn();
            }
            else {
                this.navigator.zoomOut();
            }
        }
    }

    mousedown(event) {
        event.preventDefault();
        event.stopPropagation();
        this.startPoint = [event.clientX, event.clientY];
        this.isStarted = true;
        if (!this.select) {
            this.select = document.createElement('div');
            this.select.setAttribute('class', 'navigate-select');
            this.select.style.position = 'absolute';
            this.select.style.pointerEvents = 'none';
            this.select.style.display = 'none';
            this.navigator.options.container.appendChild(this.select);
        }

    }

    mousemove(event) {
        if (this.isStarted) {
            const sp = this.startPoint;
            const hp = [event.clientX, event.clientY];
            const extent = new Geometry.Extent(sp.concat(hp));
            extent.normalize();
            const tl = extent.getBottomLeft().getCoordinates();
            this.select.style.left = `${tl[0]}px`;
            this.select.style.top = `${tl[1]}px`;
            this.select.style.width = `${extent.getWidth()}px`;
            this.select.style.height = `${extent.getHeight()}px`;

            if (!this.isMoving) {
                this.isMoving = true;
                this.select.style.display = 'block';
            }
        }
    }

    mouseup(event) {
        if (this.isStarted) {
            const endPoint = [event.clientX, event.clientY];
            const startPoint = this.startPoint;
            const dist = vecDist(startPoint, endPoint);

            if (dist > 2) {
                const TI = this.navigator.transform.inverse();
                const extent = unprojectExtent(transformExtent(startPoint.concat(endPoint), TI));

                region.push(extent);
            }
            else {
                this.navigator.centerOn(startPoint);
            }
            this.isStarted = false;
            this.isMoving = false;
            this.select.style.display = 'none';
        }
    }
}

util.inherits(NavigatorModeBase, NavigatorMode);


const NAVIGATOR_MODES = [
    NavigatorModeBase,
];


class Navigator {
    constructor(options) {
        this.options = options;
        this.setupModes();
        this.setupCanvas();
        this.setupButtons();
        this.map = options.map;

        const view = options.map.getView();

        Object.defineProperty(this, 'transform', {
            get() {
                return view.transform.clone();
            }
        });
    }

    setupButtons() {
        const container = this.options.container;
        const buttonBlock = document.createElement('div');

        buttonBlock.setAttribute('class', 'navigate-buttons');

        const zoomIn = makeButton('+', {
            'class': 'navigate-button navigate-zoom-in',
            'title': '[i]'
            }, this.zoomIn, this);

        const zoomOut = makeButton('-', {
            'class': 'navigate-button navigate-zoom-out',
            'title': '[o]'
        }, this.zoomOut, this);

        const west = makeButton('↦', {
            'class': 'navigate-button navigate-west'
        }, this.west, this);

        const east = makeButton('↤', {
            'class': 'navigate-button navigate-east'
        }, this.east, this);

        const north = makeButton('↧', {
            'class': 'navigate-button navigate-north'
        }, this.north, this);

        const south = makeButton('↥', {
            'class': 'navigate-button navigate-south'
        }, this.south, this);

        const exit = makeButton('exit', {
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
    }

    setupCanvas() {
        const container = this.options.container;
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

        const dispatcher = _.bind(this.dispatcher, this);

        const events = [
            'click', 'dblclick',
            'mousedown', 'mousemove', 'mouseup',
            'keypress', 'keydown', 'keyup',
            'wheel'
            ];

        for (let i = 0; i < events.length; i++) {
            this.canvas.addEventListener(events[i], dispatcher, false);
        }
    }

    setupModes() {
        for (let i = 0; i < NAVIGATOR_MODES.length; i++) {
            this.createMode(NAVIGATOR_MODES[i]);
        }
    }

    clear() {
        const rect = this.canvas.getBoundingClientRect();
        this.context.clearRect(0, 0, rect.width, rect.height);
    }

    start(ender) {
        this.ender = ender;
        this.setMode('ModeBase');
    }

    end() {
        this.ender();
    }

    drawRegion() {
        const ctx = this.context;
        const rect = this.canvas.getBoundingClientRect();
        const extent = region.get();
        let bl = extent.getBottomLeft().getCoordinates();
        let tr = extent.getTopRight().getCoordinates();
        const centerLatLong = extent.getCenter().getCoordinates();
        let center;

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
    }

    drawScale() {
        const ctx = this.context;
        const rect = this.canvas.getBoundingClientRect();
        const extent = region.get();
        let bl = extent.getBottomLeft().getCoordinates();
        let tr = extent.getTopRight().getCoordinates();
        const centerLatLong = extent.getCenter().getCoordinates();
        let center;

        bl = Proj3857.forward(bl);
        tr = Proj3857.forward(tr);
        center = Proj3857.forward(centerLatLong);
        this.transform.mapVec2(bl);
        this.transform.mapVec2(tr);
        this.transform.mapVec2(center);

        const left = 13; // centimeters
        const right = 74;
        const top = rect.height - 17;
        const thickness = 6;
        const bottom = top + thickness;
        const length = right - left;
        const hw = ((length - 1) / 2) + left;
        const leftVec = this.map.getCoordinateFromPixel([left, top]);
        const rightVec = this.map.getCoordinateFromPixel([right, top]);
        const dist = turf.distance(turf.point(leftVec), turf.point(rightVec), 'kilometers') * 100000;

        const formatNumber = n => {
            if (Math.floor(n) === n) {
                return n;
            }
            return n.toFixed(2);
        };

        let labelRight;
        let labelCenter;
        if (dist < 100) {
            labelRight = `${formatNumber(dist)} cm`;
            labelCenter = `${formatNumber(dist/2)} cm`;
        }
        else if (dist < 100000) {
            labelRight = `${formatNumber(dist / 100)} m`;
            labelCenter = `${formatNumber((dist/2)/100)} m`;
        }
        else {
            labelRight = `${formatNumber(dist / 100000)} km`;
            labelCenter = `${formatNumber((dist/2) / 100000)} km`;
        }

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
    }

    draw(selected) {
        this.clear();
        this.drawRegion();
        this.drawScale();
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
        if (this.currentMode) {
            const oldMode = this.getMode();
            if (oldMode.exit) {
                oldMode.exit();
            }
        }
        this.currentMode = modeName;
        if (this.modeButtons) {
            for (const mb in this.modeButtons) {
                this.modeButtons[mb].setAttribute('class', 'trace-button');
            }
            this.modeButtons[modeName].setAttribute('class', 'trace-button active');
        }
        const mode = this.getMode();
        if (mode.enter) {
            mode.enter();
        }
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

    zoomIn() {
        const extent = region.get();
        const val = getStep(extent);
        region.push(extent.buffer(-val));
    }

    zoomOut() {
        const extent = region.get();
        const val = getStep(extent);
        region.push(extent.buffer(val));
    }

    north() {
        const T = new Transform();
        const extent = region.get();
        const val = getStep(extent);

        T.translate(0, -val);
        transformRegion(T, extent);
    }

    south() {
        const T = new Transform();
        const extent = region.get();
        const val = getStep(extent);

        T.translate(0, val);
        transformRegion(T, extent);
    }

    east() {
        const T = new Transform();
        const extent = region.get();
        const val = getStep(extent);

        T.translate(-val, 0);
        transformRegion(T, extent);
    }

    west() {
        const T = new Transform();
        const extent = region.get();
        const val = getStep(extent);

        T.translate(val, 0);
        transformRegion(T, extent);
    }

    centerOn(pix) {
        const coords = this.map.getCoordinateFromPixel(pix);
        const T = new Transform();
        const extent = region.get();
        const center = extent.getCenter().getCoordinates();

        T.translate(coords[0] - center[0], coords[1] - center[1]);
        transformRegion(T, extent);
    }
}




function navigate () {
    const self = this;
    const shell = self.shell;
    const stdout = shell.stdout;
    const terminal = shell.terminal;
    const map = shell.env.map;
    const display = terminal.display();

    const options = {
        'container': display.node,
        'map': map
    };

    const nav = new Navigator(options);

    const resolver = (resolve, reject) => {

        const ender = extent => {
            display.end();
            resolve(extent);
        };

        nav.start(ender);
    };

    return (new Promise(resolver));
}


export default {
    name: 'navigate',
    command: navigate
};
