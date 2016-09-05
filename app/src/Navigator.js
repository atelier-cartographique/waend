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

import _ from 'underscore';
import Geometry from '../lib/Geometry';
import Transform from '../lib/Transform';
import Projection from 'proj4';
import region from '../lib/Region';
import semaphore from '../lib/Semaphore';
import turf from 'turf';
import Transport from '../lib/Transport';
import {projectExtent, unprojectExtent, transformExtent,
        vecDist, px} from '../lib/helpers';
import debug from 'debug';
const logger = debug('waend:Navigator');
const Proj3857 = Projection('EPSG:3857');


function isKeyCode (event, kc) {
    return (kc === event.which || kc === event.keyCode);
}

function getStep (extent) {
    const width = extent.getWidth();
    const height = extent.getHeight();
    const diag = Math.sqrt((width*width) + (height*height));

    return (diag / 20);
}

function transformRegion (T, opt_extent) {
    const extent = opt_extent.extent;
    const NE = T.mapVec2([extent[2], extent[3]]);
    const SW = T.mapVec2([extent[0], extent[1]]);
    const newExtent = [SW[0], SW[1], NE[0], NE[1]];
    region.push(newExtent);
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
    }

    getMouseEventPos(ev) {
        if (ev instanceof MouseEvent) {
            const target = ev.target;
            const trect = target.getBoundingClientRect();
            const node = this.navigator.getNode();
            const nrect = node.getBoundingClientRect();
            return [
                ev.clientX - (nrect.left - trect.left),
                ev.clientY - (nrect.top - trect.top)
            ];
        }
        return [0, 0];
    }
}

class NavigatorModeBase extends NavigatorMode {
    constructor() {
        super(...arguments);
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
        this.startPoint = this.getMouseEventPos(event);
        this.isStarted = true;
        this.isPanning = !event.shiftKey;
    }

    drawPanControl(hp) {
        const sp = this.startPoint;
        const extent = new Geometry.Extent(sp.concat(hp));
        const ctx = this.navigator.context;
        extent.normalize();
        const tl = extent.getBottomLeft().getCoordinates();
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.save();
        ctx.strokeStyle = '#0092FF';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sp[0], sp[1]);
        ctx.lineTo(hp[0], hp[1]);

        const tr0 = new Transform();
        const tr1 = new Transform();
        const mpX = sp[0] + ((hp[0] - sp[0]) * 0.9);
        const mpY = sp[1] + ((hp[1] - sp[1]) * 0.9);
        const mp0 = [mpX, mpY];
        const mp1 = [mpX, mpY];

        tr0.rotate(60, hp);
        tr1.rotate(-60, hp);
        tr0.mapVec2(mp0);
        tr1.mapVec2(mp1);

        ctx.lineTo(mp0[0], mp0[1]);
        ctx.lineTo(mp1[0], mp1[1]);
        ctx.lineTo(hp[0], hp[1]);

        ctx.stroke();
        ctx.restore();
    }

    drawZoomControl(hp) {
        const sp = this.startPoint;
        const extent = new Geometry.Extent(sp.concat(hp));
        const ctx = this.navigator.context;
        extent.normalize();
        const tl = extent.getBottomLeft().getCoordinates();
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
    }

    mousemove(event) {
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
    }

    mouseup(event) {
        if (this.isStarted) {
            const endPoint = this.getMouseEventPos(event);
            const startPoint = this.startPoint;
            const dist = vecDist(startPoint, endPoint);
            const map = this.navigator.map;
            const ctx = this.navigator.context;

            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

            if (dist > 4) {
                const startCoordinates = map.getCoordinateFromPixel(startPoint);
                const endCoordinates = map.getCoordinateFromPixel(endPoint);
                if (this.isPanning) {
                    const T = new Transform();
                    var extent = region.get();
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
    }
}



const NAVIGATOR_MODES = [
    NavigatorModeBase,
];


class Navigator {
    constructor(options) {
        this.options = options;
        this.setupModes();
        this.setupCanvas();
        this.map = options.map;
        const view = options.view;

        Object.defineProperty(this, 'transform', {
            get() {
                return view.transform.clone();
            }
        });
        logger('constructed');
    }

    setupCanvas() {
        const container = this.options.container,
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

        const dispatcher = _.bind(this.dispatcher, this);
        for (let i = 0; i < this.events.length; i++) {
            logger('add to dispatcher', this.events[i]);
            this.canvas.addEventListener(this.events[i], dispatcher, false);
        }
    }

    resize() {
        const container = this.options.container;
        const rect = container.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        this.draw();
    }

    getNode() {
        return this.canvas;
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

    start() {
        this.isStarted = true;
        this.setMode('ModeBase');
        this.draw();
    }

    end() {
        this.ender();
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

        const rightOffset = 64; // centimeters
        const scaleWidth = 74;
        const right = rect.width - rightOffset;
        let left = rect.width - (scaleWidth + rightOffset);
        const top = rect.height - 17;
        const thickness = 6;
        const bottom = top + thickness;
        const length = right - left;
        const hw = ((length - 1) / 2) + left;
        const leftVec = this.map.getCoordinateFromPixel([left, top]);
        const rightVec = this.map.getCoordinateFromPixel([right, top]);
        const dist = turf.distance(turf.point(leftVec), turf.point(rightVec), 'kilometers') * 100000;

        const formatNumber = n => // if (Math.floor(n) === n) {
        //     return n;
        // }
        // return n.toFixed(2);
        Math.ceil(n);

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

        // adjust scale size to fit dispayed size
        const distDiff = Math.ceil(dist) / dist;
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
    }

    draw(selected) {
        this.clear();
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
        if (_.isFunction(mode.enter)) {
            mode.enter();
        }
        return this;
    }

    getMode() {
        return this.modes[this.currentMode];
    }

    dispatcher(event) {
        event.preventDefault();
        event.stopPropagation();
        const type = event.type;
        const mode = this.getMode();

        if (mode && (_.isFunction(mode[type]))) {
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

Navigator.prototype.events = [
    'click', 'dblclick',
    'mousedown', 'mousemove', 'mouseup',
    'keypress', 'keydown', 'keyup',
    'wheel'
];


export default Navigator;
