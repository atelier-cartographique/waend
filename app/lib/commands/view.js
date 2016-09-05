import _ from 'underscore';
import util from 'util';
import Promise from 'bluebird';
import Geometry from '../Geometry';
import Transform from '../Transform';
import Projection from 'proj4';
import region from '../Region';
import semaphore from '../Semaphore';
import turf from 'turf';
import config from '../../config';
import Transport from '../Transport';
import SyncHandler from './SyncHandler';
import {projectExtent, unprojectExtent, transformExtent, vecDist, isKeyCode, setAttributes, addClass, removeClass, toggleClass, makeButton, layerExtent, getModelName, emptyElement} from '../helpers';
import debug from 'debug';
const logger = debug('waend:command:view');

const API_URL = config.public.apiUrl;
const MEDIA_URL = config.public.mediaUrl;


function getStep (extent) {
    const width = extent.getWidth();
    const height = extent.getHeight();
    const diag = Math.sqrt((width*width) + (height*height));

    return (diag / 6);
}

function transformRegion (T, opt_extent) {
    const extent = opt_extent.extent;
    const NE = T.mapVec2([extent[2], extent[3]]);
    const SW = T.mapVec2([extent[0], extent[1]]);
    const newExtent = [SW[0], SW[1], NE[0], NE[1]];
    region.push(newExtent);
}

function sampleData (data, rate) {
    const step = Math.floor(data.length * rate);
    const sample = new Array(Math.ceil(data.length / step));

    for (let i = 0; i < data.length; i += step) {
        sample.push(data[i]);
    }
    return sample;
}

function compareSample (a, b) {
    if (a.length !== b.length) {
        return false;
    }
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) {
            return false;
        }
    }
    return true;
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

    getTouchEventPos(ev, id) {
        if (ev instanceof TouchEvent) {
            const touch = _.find(ev.changedTouches, t => t.identifier === id);
            if (touch) {
                const target = ev.target;
                const trect = target.getBoundingClientRect();
                return [
                    touch.clientX - trect.left,
                    touch.clientY - trect.top
                ];
            }
        }
        return [0, 0];
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
        this.previewImageData = null;
        const prepare = _.bind(this.preparePreview, this);
        this.prepPreviewId = setInterval(prepare, 100);
    }

    exit() {
        this.navigator.clear();
        this.isActive = false;
        clearInterval(this.prepPreviewId);
        this.prepPreviewId = null;
    }

    preparePreview() {
        if (this.isMoving || this.isWheeling || this.isPreparingPreview) {
            return;
        }
        const now = _.now();
        const firstRun = !this.previewImageData;
        let lastRunAt;
        let nextRunIn;
        let next;
        if (!firstRun) {
            lastRunAt = this.previewImageData.lastRunAt;
            nextRunIn = this.previewImageData.nextRunIn;
            next = lastRunAt + nextRunIn;

            if ((next - now) > 0) {
                return;
            }
        }
        this.isPreparingPreview = true;
        const ts = _.now();
        const view = this.navigator.view;
        const rect = view.getRect();
        const canvas = document.createElement('canvas');
        const images = [];
        let ctx;
        let data;
        let alpha;
        let idata;

        canvas.width = rect.width;
        canvas.height = rect.height;
        ctx = canvas.getContext('2d');
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, rect.width, rect.height);
        this.previewImageData = ctx.getImageData(0, 0, rect.width, rect.height);
        data = this.previewImageData.data;

        this.navigator.map.getView()
            .forEachImage(imageData => {
                images.push(imageData);
            });

        for (let i = 0; i < data.length; i += 4) {
            for (let j = 0; j < images.length; j++) {
                idata = images[j].data;
                alpha = idata[i + 3] / 255;
                const r = i;
                const g = i + 1;
                const b = i + 2;
                if (alpha > 0) {
                    data[r] = (data[r] * (1 - alpha)) + (idata[r] * alpha);
                    data[g] = (data[g] * (1 - alpha)) + (idata[g] * alpha);
                    data[b] = (data[b] * (1 - alpha)) + (idata[b] * alpha);
                }
            }
        }
        const sample = sampleData(data, 0.1);
        this.previewImageData.nextRunIn = 200;
        if (firstRun) {
            this.previewSample = sample;
        }
        else {
            if(compareSample(this.previewSample, sample)) {
                this.previewImageData.nextRunIn = nextRunIn * 2;
            }
        }
        ctx.putImageData(this.previewImageData, 0, 0);
        this.previewCanvas = canvas;
        this.previewImageData.lastRunAt = _.now();
        this.previewSample = sample;
        this.isPreparingPreview = false;
        logger('NavigatorModeBase.preparePreview END', _.now() - ts);
    }

    wheel(event) {
        const toId = this.wheelToId;
        this.wheelDeltas = this.wheelDeltas || [];
        const extent = region.get();
        const newExtent = new Geometry.Extent(extent);

        this.wheelDeltas.push(event.deltaY);

        // replays deltas
        for (const delta of this.wheelDeltas) {
            if (delta < 0) {
                newExtent.buffer(-val);
            }
            else {
                newExtent.buffer(val);
            }
        }

        if (this.isWheeling && this.previewImageData) {
            let ts = _.now();
            logger('wheel draw');
            const ctx = this.navigator.context;
            const rect = this.navigator.view.getRect();
            const geoCenter = newExtent.getCenter().getCoordinates();
            const center = this.navigator.map.getPixelFromCoordinate(geoCenter);
            const canvasCenter = [rect.width / 2, rect.height /2];
            const t1a = extent.getTopLeft().getCoordinates();
            const t1b = newExtent.getTopLeft().getCoordinates();
            const t2a = extent.getBottomRight().getCoordinates();
            const t2b = newExtent.getBottomRight().getCoordinates();
            const d0 = vecDist(t1a, t2a);
            const d1 = vecDist(t1b, t2b);
            const scale = d0 / d1;
            const tr = new Transform();

            tr.scale(scale, scale, canvasCenter);
            logger('wheel.draw init took', _.now() - ts);
            // var tl = tr.mapVec2([0,0]);
            ts = _.now();
            ctx.save();
            ctx.fillStyle = 'white';
            ctx.strokeStyle = 'blue';
            ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            ctx.setTransform(...tr.flatMatrix());
            // ctx.strokeRect(tl[0], tl[1],
            //                 rect.width * scale, rect.height * scale);
            ctx.drawImage(this.previewCanvas,
                            0, 0,
                            rect.width, rect.height);
            ctx.restore();
            logger('wheel.draw drawImage took', _.now() - ts);
        }

        this.isWheeling  = true;
        const that = this;

        if (toId) {
            clearTimeout(toId);
        }

        this.wheelToId = setTimeout(() => {
            logger('wheel completed');
            region.push(newExtent);
            that.isWheeling= false;
            that.wheelDeltas = [];
            that.previewImageData = null;
        }, 300);
    }

    mousedown(event) {
        this.startPoint = this.getMouseEventPos(event);
        this.isStarted = true;
    }

    mousemove(event) {
        if (this.isStarted) {
            const sp = this.startPoint;
            const hp = this.getMouseEventPos(event);
            const extent = new Geometry.Extent(sp.concat(hp));
            const ctx = this.navigator.context;
            const view = this.navigator.view;
            const rect = view.getRect();
            extent.normalize();
            const tl = extent.getBottomLeft().getCoordinates();
            if (this.isMoving && this.previewImageData) {
                ctx.save();
                ctx.fillStyle = 'white';
                ctx.strokeStyle = 'blue';
                ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
                ctx.putImageData(this.previewImageData,
                                    hp[0] - sp[0],
                                    hp[1] - sp[1]);
                ctx.restore();
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
            var extent = new Geometry.Extent(startPoint.concat(endPoint));
            const ctx = this.navigator.context;
            extent.normalize();
            const tl = extent.getBottomLeft().getCoordinates();

            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

            if (dist > 4) {
                const startCoordinates = map.getCoordinateFromPixel(startPoint);
                const endCoordinates = map.getCoordinateFromPixel(endPoint);
                const T = new Transform();
                const extent = region.get();

                T.translate(startCoordinates[0] - endCoordinates[0],
                            startCoordinates[1] - endCoordinates[1]);
                transformRegion(T, extent);
            }
            else {
                this.navigator.centerOn(startPoint);
            }
            this.isStarted = false;
            this.isMoving = false;
            this.previewImageData = null;
        }
    }

    touchstart(event) {
        this.touches = _.reduce(event.changedTouches, function(memo, touch){
            memo[touch.identifier] = this.getTouchEventPos(event, touch.identifier);
            return memo;
        }, {}, this);

        const tKeys = _.keys(this.touches);
        const isZooming = 2 === tKeys.length;
        const isPanning = 1 === tKeys.length;

        this.touchZooming = isZooming;
        this.touchPanning = isPanning;
        this.touchStartTS = _.now();
    }

    touchmove(event) {
        const touches = _.reduce(event.changedTouches,
        function(memo, touch){
            memo[touch.identifier] = this.getTouchEventPos(event, touch.identifier);
            return memo;
        }, {}, this);
        const keys = _.keys(touches);
        if (this.touchPanning && (2 === keys.length)) {
            const ts = _.now();
            if ((ts - this.touchStartTS) < 1000) {
                this.touchPanning = false;
                this.touchZooming = true;
                _.defaults(this.touches, touches);

            }
            else {
                this.touchend(event);
                this.touchstart(event);
                return;
            }
        }
        if (this.isMoving && this.previewImageData) {
            if (this.touchPanning) {
                const touch = event.changedTouches[0];
                const sp = this.touches[touch.identifier];
                const hp = this.getTouchEventPos(event, touch.identifier);
                const extent = new Geometry.Extent(sp.concat(hp));
                var ctx = this.navigator.context;
                const view = this.navigator.view;
                var rect = view.getRect();
                extent.normalize();
                const tl = extent.getBottomLeft().getCoordinates();

                ctx.save();
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
                ctx.putImageData(this.previewImageData,
                                    hp[0] - sp[0],
                                    hp[1] - sp[1]);
                ctx.restore();
            }
            else if (this.touchZooming) {
                if (2 !== keys.length) {
                    return;
                }

                const ctx = this.navigator.context;
                const rect = this.navigator.view.getRect();
                const center = [rect.width / 2, rect.height /2];
                const t1a = this.touches[keys[0]];
                const t1b = touches[keys[0]];
                const t2a = this.touches[keys[1]];
                const t2b = touches[keys[1]];
                const d0 = vecDist(t1a, t2a);
                const d1 = vecDist(t1b, t2b);
                const scale = d1 / d0;
                const tr = new Transform();

                tr.scale(scale, scale, center);

                ctx.save();
                ctx.fillStyle = 'white';
                ctx.strokeStyle = 'blue';
                ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
                ctx.setTransform(...tr.flatMatrix());
                ctx.strokeRect(0, 0, rect.width, rect.height);
                ctx.drawImage(this.previewCanvas, 0, 0, rect.width, rect.height);
                ctx.restore();
                this.zoomTouches = touches;
            }
        }

        if (!this.isMoving) {
            this.isMoving = true;
        }
    }

    touchend(event) {
        if (this.touchPanning) {
            var touches = event.changedTouches;
            const touch = touches[0];
            const endPoint = this.getTouchEventPos(event, touch.identifier);
            const startPoint = this.touches[touch.identifier];
            const dist = vecDist(startPoint, endPoint);
            const map = this.navigator.map;
            var extent = new Geometry.Extent(startPoint.concat(endPoint));
            extent.normalize();
            const tl = extent.getBottomLeft().getCoordinates();


            if (dist > 4) {
                const startCoordinates = map.getCoordinateFromPixel(startPoint);
                const endCoordinates = map.getCoordinateFromPixel(endPoint);
                const T = new Transform();
                const extent = region.get();

                T.translate(startCoordinates[0] - endCoordinates[0],
                            startCoordinates[1] - endCoordinates[1]);
                transformRegion(T, extent);
            }
            else {
                this.navigator.centerOn(startPoint);
            }
        }
        else if (this.touchZooming) {
            const touches = this.zoomTouches;
            const keys = _.keys(touches);
            const extent = region.get();
            const center = extent.getCenter().getCoordinates();
            const t1a = this.touches[keys[0]];
            const t1b = touches[keys[0]];
            const t2a = this.touches[keys[1]];
            const t2b = touches[keys[1]];
            const d0 = vecDist(t1a, t1b);
            const d1 = vecDist(t2a, t2b);
            const scale = d1 / d0;
            const tr = new Transform();

            tr.scale(scale, scale, center);
            transformRegion(tr, extent);
        }
        const ctx = this.navigator.context;
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        this.touchPanning = false;
        this.touchZooming = false;
        this.isMoving = false;
        this.previewImageData = null;
    }
}

util.inherits(NavigatorModeBase, NavigatorMode);

const NAVIGATOR_MODES = [
    NavigatorModeBase,
];


class Navigator {
    constructor(options) {
        this.options = options;
        this.map = options.map;
        this.view = options.map.getView();
        this.setupModes();
        this.setupCanvas();
        // this.setupButtons();

        const view = options.map.getView();

        Object.defineProperty(this, 'transform', {
            get() {
                return view.transform.clone();
            }
        });

        semaphore.on('view:resize', function (view) {
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

        buttonBlock.setAttribute('class', 'navigate-buttons');

        const zoomIn = makeButton('', {
            'class': 'navigate-button navigate-zoom-in',
            'title': '[i]'
            }, this.zoomIn, this);

        const zoomOut = makeButton('', {
            'class': 'navigate-button navigate-zoom-out',
            'title': '[o]'
        }, this.zoomOut, this);

        const west = makeButton('', {
            'class': 'navigate-button navigate-west'
        }, this.west, this);

        const east = makeButton('', {
            'class': 'navigate-button navigate-east'
        }, this.east, this);

        const north = makeButton('', {
            'class': 'navigate-button navigate-north'
        }, this.north, this);

        const south = makeButton('', {
            'class': 'navigate-button navigate-south'
        }, this.south, this);


        buttonBlock.appendChild(zoomIn);
        buttonBlock.appendChild(zoomOut);
        buttonBlock.appendChild(north);
        buttonBlock.appendChild(east);
        buttonBlock.appendChild(south);
        buttonBlock.appendChild(west);

        container.appendChild(buttonBlock);
    }

    setupCanvas() {
        const container = this.options.container;
        const rect = this.view.getRect();

        this.canvas = document.createElement('canvas');
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        this.canvas.backgroundColor = 'transparent';
        this.canvas.style.position = 'absolute';
        this.canvas.style.willChange = 'transform';
        this.canvas.style.transform = 'translateZ(0)';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';

        container.appendChild(this.canvas);
        this.canvas.setAttribute('tabindex', -1);
        // this.canvas.focus();
        this.context = this.canvas.getContext('2d');

        const dispatcher = _.bind(this.dispatcher, this);

        const events = [
            'click', 'dblclick',
            'mousedown', 'mousemove', 'mouseup',
            'keypress', 'keydown', 'keyup',
            'wheel',
            'touchstart', 'touchend', 'touchcancel', 'touchmove'
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

    draw(selected) {
        this.clear();
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
        event.preventDefault();
        event.stopPropagation();
        const type = event.type;
        const mode = this.getMode();
        logger(type);
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



function showGroupLegend(node, group) {
    const wrapper = document.createElement('div');
    const titleWrapper = document.createElement('div');
    const titleLabel = document.createElement('span');
    const title = document.createElement('span');
    const descLabel = document.createElement('span');
    const desc = document.createElement('span');

    wrapper.setAttribute('class', 'view-group-wrapper');
    titleWrapper.setAttribute('class', 'view-group-title-wrapper');
    titleLabel.setAttribute('class', 'view-group-label');
    title.setAttribute('class', 'view-group-title');
    descLabel.setAttribute('class', 'view-group-label');
    desc.setAttribute('class', 'view-group-description');

    // titleLabel.innerHTML = "name ";
    title.innerHTML = group.get('name', 'Title');
    // descLabel.innerHTML = "description — ";
    desc.innerHTML = group.get('description', 'Description');


    // titleWrapper.appendChild(titleLabel);
    titleWrapper.appendChild(title);
    // wrapper.appendChild(descLabel);
    wrapper.appendChild(titleWrapper);
    wrapper.appendChild(desc);
    node.appendChild(wrapper);
}


function lookupResults(container) {
    const callback = data => {
        emptyElement(container);

        if('results' in data) {
            const groups = {};
            for (var i = 0; i < data.results.length; i++) {
                var result = data.results[i];
                if (!(result.id in groups)) {
                    groups[result.id] = {
                        model: result,
                        score: 1
                    };
                }
                else {
                    groups[result.id].score += 1;
                }
            }
            const og = _.values(groups);
            og.sort((a, b) => b.score - a.score);

            for (var i = 0; i < og.length; i++) {
                const elem = document.createElement('div');
                const anchor = document.createElement('a');
                const result = og[i].model;
                const props = result.properties;
                const name = props.name;
                const ctxPath = `/${result.user_id}/${result.id}`;

                anchor.setAttribute('class', 'view-lookup-result-title');
                elem.setAttribute('class', 'view-lookup-result');
                anchor.setAttribute('href', `/view${ctxPath}`);
                anchor.appendChild(document.createTextNode(name));
                elem.appendChild(anchor);


                if ('image' in props) {
                    const img = document.createElement('img');
                    img.setAttribute('class', 'view-lookup-result-image');
                    img.setAttribute('src', `${MEDIA_URL}/${props.image}/400`);
                    elem.appendChild(img);
                }

                if ('description' in props) {
                    const desc = document.createElement('div');
                    desc.setAttribute('class', 'view-lookup-result-description');
                    desc.appendChild(
                        document.createTextNode(
                            props.description.slice(0, 200)
                        )
                    );
                    elem.appendChild(desc);
                }

                container.appendChild(elem);
            }
            removeClass(container, 'hidden');
        }
    };
    return callback;
}

function lookupTerm (term, callback) {
    const transport = new Transport();
    transport
        .get(`${API_URL}/group/${term}`)
        .then(callback)
        .catch(err => {
            console.error('lookupTerm', err);
        });
}

function showLookup (node) {
    const wrapper = document.createElement('div');
    const wrapperInput = document.createElement('div');
    const input = document.createElement('input');
    const inputBottomLine = document.createElement('div');
    const button = document.createElement('button');
    const results = document.createElement('div');

    wrapper.setAttribute('class', 'view-lookup-wrapper');
    wrapperInput.setAttribute('class', 'input-wrapper');
    input.setAttribute('class', 'view-lookup-input');
    input.setAttribute('type', 'text');
    input.setAttribute('placeholder', 'search a map');
    inputBottomLine.setAttribute('class', 'input-bottomLine');
    button.setAttribute('class', 'view-lookup-search icon-lookup');
    results.setAttribute('class', 'view-lookup-results hidden');

    button.innerHTML = "";

    wrapperInput.appendChild(input);
    wrapperInput.appendChild(inputBottomLine);

    wrapper.appendChild(wrapperInput);
    wrapper.appendChild(button);
    wrapper.appendChild(results);
    node.appendChild(wrapper);

    const lookup = () => {
        const term = input.value.trim();
        input.value = '';
        lookupTerm(term, lookupResults(results));
    };

    const triggerOnEnter = event => {
        if(isKeyCode(event, 13)) {
            const term = input.value.trim();
            input.value = '';
            lookupTerm(term, lookupResults(results));
        }
    };
    button.addEventListener('click', lookup, false);
    input.addEventListener('keyup', triggerOnEnter, false);
}


function waendCredit (node) {
    const waendCredit = document.createElement('div');
    const waendCreditLink = document.createElement('a');
    const waendCreditLinkToLogin = document.createElement('a');
    const waendCreditLinkToRegister = document.createElement('a');

    waendCredit.setAttribute('class', 'credit-waend');

    waendCreditLink.setAttribute('href', 'http://waend.com');
    // waendCreditLink.setAttribute('target', 'blank');
    waendCreditLink.innerHTML = 'wænd.com';

    waendCreditLinkToLogin.setAttribute('href', 'http://alpha.waend.com');
    // waendCreditLinkToLogin.setAttribute('target', 'blank');
    waendCreditLinkToLogin.innerHTML = ' • login • ';

    waendCreditLinkToRegister.setAttribute('href', 'http://alpha.waend.com/register');
    // waendCreditLinkToRegister.setAttribute('target', 'blank');
    waendCreditLinkToRegister.innerHTML = 'register';

    waendCredit.appendChild(waendCreditLink);
    waendCredit.appendChild(waendCreditLinkToLogin);
    waendCredit.appendChild(waendCreditLinkToRegister);
    node.appendChild(waendCredit);
}


function listLayers (context, node) {
    class Lister {
        constructor(l=[]) {
            this._list = JSON.parse(JSON.stringify(l));
        }

        index(x) {
            return _.indexOf(this._list, x);
        }

        has(x) {
            return (this.index(x) > -1);
        }

        insert(idx, x) {
            if (this._list.length < idx) {
                this._list.push(x);
            }
            else {
                this._list.splice(idx, 0, x);
            }
        }

        remove(x) {
            this._list = _.without(this._list, x);
        }

        getList() {
            return JSON.parse(JSON.stringify(this._list));
        }
    }

    function listItem (layer, container, idx, lister) {
        const isVisible = lister.has(layer.id);
        const elem = document.createElement('div');
        const vis = document.createElement('span');
        const ext = document.createElement('span');
        const label = document.createElement('span');
        const extra = document.createElement('div');
        const actions = document.createElement('div');
        const desc = document.createElement('div');


        addClass(elem, 'layer-item');
        addClass(label, 'layer-item-label');
        addClass(extra, 'layer-item-extra');
        addClass(desc, 'layer-item-description');
        addClass(actions, 'layer-item-actions');
        addClass(vis, 'layer-item-action-visible visible-layer');
        addClass(ext, 'layer-item-action-extent icon-setmapextent');

        if (isVisible) {
            addClass(vis, 'visible-yes');
        }
        else {
            addClass(vis, 'visible-no');
        }

        label.appendChild(document.createTextNode(getModelName(layer)));
        desc.appendChild(document.createTextNode(layer.get('description' , '---')));

        elem.appendChild(actions);
        elem.appendChild(label);
        elem.appendChild(extra);
        extra.appendChild(desc);
        actions.appendChild(vis);
        actions.appendChild(ext);
        container.appendChild(elem);

        const toggleExtra = () => {

            toggleClass(elem, 'unfold');
        };


        const toggleVisible = () => {
            if (lister.has(layer.id)) {
                lister.remove(layer.id);
                removeClass(vis, 'visible-yes');
                addClass(vis, 'visible-no');
            }
            else {
                lister.insert(idx, layer.id);
                removeClass(vis, 'visible-no');
                addClass(vis, 'visible-yes');
            }
            semaphore.signal('visibility:change', lister.getList());
        };

        const toExtent = () => {
            layerExtent(layer)
                .then(_.bind(region.push, region))
                .catch(err => {console.error(err)});
        };

        vis.addEventListener('click', toggleVisible, false);
        ext.addEventListener('click', toExtent, false);
        label.addEventListener('click', toggleExtra, false);
    }

    const self = context;
    const userId = self.getUser();
    const groupId = self.getGroup();
    const data = self.data;
    const binder = self.binder;
    const wrapper = document.createElement('div');
    const title = document.createElement('div');
    const list = document.createElement('div');

    title.innerHTML = 'layers';

    title.addEventListener('click', () => {
        toggleClass(wrapper, 'unfold');
    }, false);

    title.setAttribute('class', 'view-visible-title');
    wrapper.setAttribute('class', 'view-visible-wrapper');
    list.setAttribute('class', 'view-visible-list');

    wrapper.appendChild(title);
    wrapper.appendChild(list);
    node.appendChild(wrapper);

    const vl = data.get('visible');
    const visibleLayers = new Lister(vl);
    const fv = !vl;

    binder.getLayers(userId, groupId)
        .then(layers => {
            for(let i = 0; i < layers.length; i++){
                const layer = layers[i];
                if (fv) {
                    visibleLayers.insert(i, layer.id);
                }
                listItem(layer, list, i, visibleLayers);
            }
        })
        .catch(err => {
            console.error('lister', err);
        });
}




function notifier(context, node) {
    const wrapper = document.createElement('div');
    const title = document.createElement('div');
    const container = document.createElement('div');
    const follow = document.createElement('span');
    const sync = new SyncHandler(container, context);

    setAttributes(wrapper, {
        'class': 'view-notify'
    });

    setAttributes(title, {
        'class': 'view-notify-title'
    });

    setAttributes(container, {
        'class': 'view-notify-container'
    });

    title.innerHTML = 'notifications ';
    follow.innerHTML = ' follow';
    let doFollow = false;
    function follower (model) {
        if (!doFollow) {
            return;
        }
        if ('feature' === model.type) {
            const geom = model.getGeometry();
            region.push(geom);
        }
    }

    setAttributes(follow, {
        'class': 'view-notification-follow button button-state'
    });

    follow.addEventListener('click', () => {
        toggleClass(follow, 'state-yes');
        doFollow = !doFollow;
    }, false);

    title.appendChild(follow);
    wrapper.appendChild(title);
    wrapper.appendChild(container);
    node.appendChild(wrapper);

    sync.follow(follower)
        .start();
}


function view () {
    const self = this;
    const shell = self.shell;
    const stdout = shell.stdout;
    const terminal = shell.terminal;
    const binder = self.binder;
    const map = shell.env.map;
    const display = terminal.display({fullscreen: true});
    const userId = self.getUser();
    const groupId = self.getGroup();

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

        showLookup(display.node);
        binder.getGroup(userId, groupId)
            .then(group => {
                showGroupLegend(display.node, group);
            })
            .catch(err => {
                console.error('getgroup', err);
            });

        listLayers(self, display.node);
        notifier(self, display.node);
        waendCredit(display.node);
    };

    return (new Promise(resolver));
}



export default {
    name: 'view',
    command: view
};
