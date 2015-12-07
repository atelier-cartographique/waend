/*
 * app/lib/commands/view.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */

'use strict';

var _ = require('underscore'),
    util = require('util'),
    Promise = require('bluebird'),
    Geometry = require('../Geometry'),
    Transform = require('../Transform'),
    Projection = require('proj4'),
    region = require('../Region'),
    semaphore = require('../Semaphore'),
    turf = require('turf'),
    config = require('../../../config'),
    Transport = require('../Transport'),
    helpers = require('../helpers'),
    SyncHandler = require('./SyncHandler');

var API_URL = config.public.apiUrl,
    MEDIA_URL = config.public.mediaUrl;

var projectExtent = helpers.projectExtent,
    unprojectExtent = helpers.unprojectExtent,
    transformExtent = helpers.transformExtent,
    vecDist = helpers.vecDist,
    isKeyCode = helpers.isKeyCode,
    setAttributes = helpers.setAttributes,
    removeClass = helpers.removeClass,
    toggleClass = helpers.toggleClass,
    makeButton = helpers.makeButton;


function getStep (extent) {
    var width = extent.getWidth(),
        height = extent.getHeight(),
        diag = Math.sqrt((width*width) + (height*height));

    return (diag / 6);

}

function transformRegion (T, opt_extent) {
    var extent = opt_extent.extent;
    var NE = T.mapVec2([extent[2], extent[3]]);
    var SW = T.mapVec2([extent[0], extent[1]]);
    var newExtent = [SW[0], SW[1], NE[0], NE[1]];
    region.push(newExtent);
}

function sampleData (data, rate) {
    var step = Math.floor(data.length * rate),
        sample = new Array(Math.ceil(data.length / step));

    for (var i = 0; i < data.length; i += step) {
        sample.push(data[i]);
    }
    return sample;
}

function compareSample (a, b) {
    if (a.length !== b.length) {
        return false;
    }
    for (var i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) {
            return false;
        }
    }
    return true;
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


NavigatorMode.prototype.getMouseEventPos = function (ev) {
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


NavigatorMode.prototype.getTouchEventPos = function (ev, id) {
    if (ev instanceof TouchEvent) {
        var touch = _.find(ev.changedTouches, function(t){
            return t.identifier === id;
        });
        if (touch) {
            var target = ev.target,
                trect = target.getBoundingClientRect();
            return [
                touch.clientX - trect.left,
                touch.clientY - trect.top
            ];
        }
    }
    return [0, 0];
}


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
    this.previewImageData = null;
    var prepare = _.bind(this.preparePreview, this);
    this.prepPreviewId = setInterval(prepare, 100);
};

NavigatorModeBase.prototype.exit = function () {
    this.navigator.clear();
    this.isActive = false;
    clearInterval(this.prepPreviewId);
    this.prepPreviewId = null;
};

NavigatorModeBase.prototype.preparePreview = function () {
    if (this.isMoving || this.isWheeling || this.isPreparingPreview) {
        return;
    }
    var now = _.now(),
        firstRun = !this.previewImageData,
        lastRunAt,
        nextRunIn,
        next;
    if (!firstRun) {
        lastRunAt = this.previewImageData.lastRunAt;
        nextRunIn = this.previewImageData.nextRunIn;
        next = lastRunAt + nextRunIn;

        if ((next - now) > 0) {
            return;
        }
    }
    this.isPreparingPreview = true;
    var ts = _.now();
    var view = this.navigator.view,
        rect = view.getRect(),
        canvas = document.createElement('canvas'),
        images = [],
        ctx, data, alpha, idata;

    canvas.width = rect.width;
    canvas.height = rect.height;
    ctx = canvas.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, rect.width, rect.height);
    this.previewImageData = ctx.getImageData(0, 0, rect.width, rect.height);
    data = this.previewImageData.data;

    this.navigator.map.getView()
        .forEachImage(function(imageData){
            images.push(imageData);
        });

    for (var i = 0; i < data.length; i += 4) {
        for (var j = 0; j < images.length; j++) {
            idata = images[j].data;
            alpha = idata[i + 3] / 255;
            var r = i,
                g = i + 1,
                b = i + 2;
            if (alpha > 0) {
                data[r] = (data[r] * (1 - alpha)) + (idata[r] * alpha);
                data[g] = (data[g] * (1 - alpha)) + (idata[g] * alpha);
                data[b] = (data[b] * (1 - alpha)) + (idata[b] * alpha);
            }
        }
    }
    var sample = sampleData(data, 0.1);
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
    console.log('NavigatorModeBase.preparePreview END', _.now() - ts);
};

NavigatorModeBase.prototype.wheel = function (event) {
    var toId = this.wheelToId;
    this.wheelDeltas = this.wheelDeltas || [];
    var extent = region.get(),
        newExtent = new Geometry.Extent(extent);

    this.wheelDeltas.push(event.deltaY);

    // replays deltas
    for (var i = 0; i < this.wheelDeltas.length; i++) {
        var delta = this.wheelDeltas[i],
            val = getStep(newExtent);
        if (delta < 0) {
            newExtent.buffer(-val);
        }
        else {
            newExtent.buffer(val);
        }
    }

    if (this.isWheeling && this.previewImageData) {
        var ts = _.now();
        console.log('wheel draw');
        var ctx = this.navigator.context,
            rect = this.navigator.view.getRect(),
            geoCenter = newExtent.getCenter().getCoordinates(),
            center = this.navigator.map.getPixelFromCoordinate(geoCenter),
            canvasCenter = [rect.width / 2, rect.height /2],
            t1a = extent.getTopLeft().getCoordinates(),
            t1b = newExtent.getTopLeft().getCoordinates(),
            t2a = extent.getBottomRight().getCoordinates(),
            t2b = newExtent.getBottomRight().getCoordinates(),
            d0 = vecDist(t1a, t2a),
            d1 = vecDist(t1b, t2b),
            scale = d0 / d1,
            tr = new Transform();

        tr.translate(center[0] - canvasCenter[0],
                     center[1] - canvasCenter[1]);
        tr.scale(scale, scale, center);
        console.log('wheel.draw init took', _.now() - ts);
        ts = _.now();
        ctx.save();
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'blue';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.setTransform.apply(ctx, tr.flatMatrix());
        // ctx.strokeRect(0, 0, rect.width, rect.height);
        ctx.drawImage(this.previewCanvas, 0, 0, rect.width, rect.height);
        ctx.restore();
        console.log('wheel.draw drawImage took', _.now() - ts);
    }

    this.isWheeling  = true;
    var that = this;

    if (toId) {
        clearTimeout(toId);
    }

    this.wheelToId = setTimeout(function () {
        console.log('wheel completed');
        region.push(newExtent);
        that.isWheeling= false;
        that.wheelDeltas = [];
        that.previewImageData = null;
    }, 300);
};


NavigatorModeBase.prototype.mousedown = function (event) {
    this.startPoint = this.getMouseEventPos(event);
    this.isStarted = true;
};


NavigatorModeBase.prototype.mousemove = function (event) {
    if (this.isStarted) {
        var sp = this.startPoint,
            hp = this.getMouseEventPos(event),
            extent = new Geometry.Extent(sp.concat(hp)),
            ctx = this.navigator.context,
            view = this.navigator.view,
            rect = view.getRect();
        extent.normalize();
        var tl = extent.getBottomLeft().getCoordinates();
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
};

NavigatorModeBase.prototype.mouseup = function (event) {
    if (this.isStarted) {
        var endPoint = this.getMouseEventPos(event),
            startPoint = this.startPoint,
            dist = vecDist(startPoint, endPoint),
            map = this.navigator.map,
            extent = new Geometry.Extent(startPoint.concat(endPoint)),
            ctx = this.navigator.context;
        extent.normalize();
        var tl = extent.getBottomLeft().getCoordinates();

        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        if (dist > 4) {
            var startCoordinates = map.getCoordinateFromPixel(startPoint),
                endCoordinates = map.getCoordinateFromPixel(endPoint);
            var T = new Transform(),
                extent = region.get();

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
};


NavigatorModeBase.prototype.touchstart = function (event) {
    this.touches = _.reduce(event.changedTouches, function(memo, touch){
        memo[touch.identifier] = this.getTouchEventPos(event, touch.identifier);
        return memo;
    }, {}, this);

    var tKeys = _.keys(this.touches),
        isZooming = 2 === tKeys.length,
        isPanning = 1 === tKeys.length;

    this.touchZooming = isZooming;
    this.touchPanning = isPanning;
    this.touchStartTS = _.now();
};

NavigatorModeBase.prototype.touchmove = function (event) {
    var touches = _.reduce(event.changedTouches,
    function(memo, touch){
        memo[touch.identifier] = this.getTouchEventPos(event, touch.identifier);
        return memo;
    }, {}, this);
    var keys = _.keys(touches);
    if (this.touchPanning && (2 === keys.length)) {
        var ts = _.now();
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
                var touch = event.changedTouches[0],
                    sp = this.touches[touch.identifier],
                    hp = this.getTouchEventPos(event, touch.identifier),
                    extent = new Geometry.Extent(sp.concat(hp)),
                    ctx = this.navigator.context,
                    view = this.navigator.view,
                    rect = view.getRect();
                extent.normalize();
                var tl = extent.getBottomLeft().getCoordinates();

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

                var ctx = this.navigator.context,
                    rect = this.navigator.view.getRect(),
                    center = [rect.width / 2, rect.height /2],
                    t1a = this.touches[keys[0]],
                    t1b = touches[keys[0]],
                    t2a = this.touches[keys[1]],
                    t2b = touches[keys[1]],
                    d0 = vecDist(t1a, t2a),
                    d1 = vecDist(t1b, t2b),
                    scale = d1 / d0,
                    tr = new Transform();

                tr.scale(scale, scale, center);

                ctx.save();
                ctx.fillStyle = 'white';
                ctx.strokeStyle = 'blue';
                ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
                ctx.setTransform.apply(ctx, tr.flatMatrix());
                ctx.strokeRect(0, 0, rect.width, rect.height);
                ctx.drawImage(this.previewCanvas, 0, 0, rect.width, rect.height);
                ctx.restore();
                this.zoomTouches = touches;
        }
    }

    if (!this.isMoving) {
        this.isMoving = true;
    }
};

NavigatorModeBase.prototype.touchend = function (event) {
    if (this.touchPanning) {
        var touches = event.changedTouches,
            touch = touches[0],
            endPoint = this.getTouchEventPos(event, touch.identifier),
            startPoint = this.touches[touch.identifier],
            dist = vecDist(startPoint, endPoint),
            map = this.navigator.map,
            extent = new Geometry.Extent(startPoint.concat(endPoint));
        extent.normalize();
        var tl = extent.getBottomLeft().getCoordinates();


        if (dist > 4) {
            var startCoordinates = map.getCoordinateFromPixel(startPoint),
                endCoordinates = map.getCoordinateFromPixel(endPoint);

            var T = new Transform(),
                extent = region.get();

            T.translate(startCoordinates[0] - endCoordinates[0],
                        startCoordinates[1] - endCoordinates[1]);
            transformRegion(T, extent);
        }
        else {
            this.navigator.centerOn(startPoint);
        }
    }
    else if (this.touchZooming) {
        var touches = this.zoomTouches,
            keys = _.keys(touches);

        var extent = region.get(),
            center = extent.getCenter().getCoordinates(),
            t1a = this.touches[keys[0]],
            t1b = touches[keys[0]],
            t2a = this.touches[keys[1]],
            t2b = touches[keys[1]],
            d0 = vecDist(t1a, t1b),
            d1 = vecDist(t2a, t2b),
            scale = d1 / d0,
            tr = new Transform();

        tr.scale(scale, scale, center);
        transformRegion(tr, extent);

    }
    var ctx = this.navigator.context;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    this.touchPanning = false;
    this.touchZooming = false;
    this.isMoving = false;
    this.previewImageData = null;
};

var NAVIGATOR_MODES = [
    NavigatorModeBase,
];


function Navigator (options) {
    this.options = options;
    this.map = options.map;
    this.view = options.map.getView();
    this.setupModes();
    this.setupCanvas();
    // this.setupButtons();

    var view = options.map.getView();

    Object.defineProperty(this, 'transform', {
        get: function () {
            return view.transform.clone();
        }
    });

    semaphore.on('view:resize', function (view) {
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


Navigator.prototype.setupButtons = function () {
    var container = this.options.container,
        buttonBlock = document.createElement('div');

    buttonBlock.setAttribute('class', 'navigate-buttons');

    var zoomIn = makeButton('', {
        'class': 'navigate-button navigate-zoom-in',
        'title': '[i]'
        }, this.zoomIn, this);

    var zoomOut = makeButton('', {
        'class': 'navigate-button navigate-zoom-out',
        'title': '[o]'
    }, this.zoomOut, this);

    var west = makeButton('', {
        'class': 'navigate-button navigate-west'
    }, this.west, this);

    var east = makeButton('', {
        'class': 'navigate-button navigate-east'
    }, this.east, this);

    var north = makeButton('', {
        'class': 'navigate-button navigate-north'
    }, this.north, this);

    var south = makeButton('', {
        'class': 'navigate-button navigate-south'
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
    var container = this.options.container,
        rect = this.view.getRect();

    this.canvas = document.createElement('canvas');
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    this.canvas.backgroundColor = 'transparent';
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';

    container.appendChild(this.canvas);
    this.canvas.setAttribute('tabindex', -1);
    // this.canvas.focus();
    this.context = this.canvas.getContext('2d');

    var dispatcher = _.bind(this.dispatcher, this),
        events = [
            'click', 'dblclick',
            'mousedown', 'mousemove', 'mouseup',
            'keypress', 'keydown', 'keyup',
            'wheel',
            'touchstart', 'touchend', 'touchcancel', 'touchmove'
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


Navigator.prototype.draw = function (selected) {
    this.clear();
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
    console.log(type);
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



function showGroupLegend(node, group) {
    var wrapper = document.createElement('div'),
        titleWrapper = document.createElement('div'),
        titleLabel = document.createElement('span'),
        title = document.createElement('span'),
        descLabel = document.createElement('span'),
        desc = document.createElement('span');

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
    var callback = function (data) {
        helpers.emptyElement(container);

        if('results' in data) {
            var groups = {};
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
            var og = _.values(groups);
            og.sort(function(a, b){
                return b.score - a.score;
            });

            for (var i = 0; i < og.length; i++) {
                var elem = document.createElement('div'),
                    anchor = document.createElement('a'),
                    result = result = og[i].model,
                    props = result.properties,
                    name = props.name,
                    ctxPath = '/' + result.user_id + '/' + result.id;

                anchor.setAttribute('class', 'view-lookup-result-title');
                elem.setAttribute('class', 'view-lookup-result');
                anchor.setAttribute('href', '/view' + ctxPath);
                anchor.appendChild(document.createTextNode(name));
                elem.appendChild(anchor);


                if ('image' in props) {
                    var img = document.createElement('img');
                    img.setAttribute('class', 'view-lookup-result-image');
                    img.setAttribute('src', MEDIA_URL + '/' + props.image + '/400');
                    elem.appendChild(img);
                }

                if ('description' in props) {
                    var desc = document.createElement('div');
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
    var transport = new Transport();
    transport
        .get(API_URL + '/group/' + term)
        .then(callback)
        .catch(function(err){
            console.error('lookupTerm', err);
        });
}

function showLookup (node) {
    var wrapper = document.createElement('div'),
        wrapperInput = document.createElement('div'),
        input = document.createElement('input'),
        inputBottomLine = document.createElement('div'),
        button = document.createElement('button'),
        results = document.createElement('div');

    wrapper.setAttribute('class', 'view-lookup-wrapper');
    wrapperInput.setAttribute('class', 'input-wrapper');
    input.setAttribute('class', 'view-lookup-input');
    input.setAttribute('type', 'text');
    input.setAttribute('placeholder', 'search');
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

    var lookup = function () {
        var term = input.value.trim();
        input.value = '';
        lookupTerm(term, lookupResults(results));
    };

    var triggerOnEnter = function (event) {
        if(isKeyCode(event, 13)) {
            var term = input.value.trim();
            input.value = '';
            lookupTerm(term, lookupResults(results));
        }
    }
    button.addEventListener('click', lookup, false);
    input.addEventListener('keyup', triggerOnEnter, false);
}


function waendCredit (node) {
    var waendCredit = document.createElement('div'),
        waendCreditLink = document.createElement('a'),
        waendCreditLinkToLogin = document.createElement('a'),
        waendCreditLinkToRegister = document.createElement('a');

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
    function Lister (l) {
        l = l || [];
        this._list = JSON.parse(JSON.stringify(l));
    }

    Lister.prototype.index = function (x) {
        return _.indexOf(this._list, x);
    };

    Lister.prototype.has = function (x) {
        return (this.index(x) > -1);
    };

    Lister.prototype.insert = function (idx, x) {
        if (this._list.length < idx) {
            this._list.push(x);
        }
        else {
            this._list.splice(idx, 0, x);
        }
    };

    Lister.prototype.remove = function (x) {
        this._list = _.without(this._list, x);
    };

    Lister.prototype.getList = function () {
        return JSON.parse(JSON.stringify(this._list));
    };

    function listItem (layer, container, idx, lister) {
        var isVisible = lister.has(layer.id),
            elem = document.createElement('div'),
            label = document.createElement('span');

        elem.setAttribute('class', 'visible-layer visible-' + (
            isVisible ? 'yes' : 'no'
        ));
        label.setAttribute('class', 'visible-layer-label');

        label.innerHTML = layer.get('name', layer.id);

        elem.appendChild(label);
        container.appendChild(elem);

        var toggle = function () {
            if (lister.has(layer.id)) {
                lister.remove(layer.id);
                elem.setAttribute('class', 'view-visible-layer visible-no');
            }
            else {
                lister.insert(idx, layer.id);
                elem.setAttribute('class', 'view-visible-layer visible-yes');
            }
            semaphore.signal('visibility:change', lister.getList());
        };

        elem.addEventListener('click', toggle, false);
    }

    var self = context,
        userId = self.getUser(),
        groupId = self.getGroup(),
        data = self.data,
        binder = self.binder;

    var wrapper = document.createElement('div'),
        title = document.createElement('div'),
        list = document.createElement('div');

    title.innerHTML = 'layers';

    title.addEventListener('click', function(){
        toggleClass(wrapper, 'unfold');
    }, false);

    title.setAttribute('class', 'view-visible-title');
    wrapper.setAttribute('class', 'view-visible-wrapper');
    list.setAttribute('class', 'view-visible-list');

    wrapper.appendChild(title);
    wrapper.appendChild(list);
    node.appendChild(wrapper);

    var vl = data.get('visible'),
        visibleLayers = new Lister(vl),
        fv = !vl;

    binder.getLayers(userId, groupId)
        .then(function(layers){
            for(var i = 0; i < layers.length; i++){
                var layer = layers[i];
                if (fv) {
                    visibleLayers.insert(i, layer.id);
                }
                listItem(layer, list, i, visibleLayers);
            }
        })
        .catch(function(err){
            console.error('lister', err);
        });

}




function notifier(context, node) {
    var wrapper = document.createElement('div'),
        title = document.createElement('div'),
        container = document.createElement('div'),
        follow = document.createElement('span'),
        sync = new SyncHandler(container, context);

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
    var doFollow = false;
    function follower (model) {
        if (!doFollow) {
            return;
        }
        if ('feature' === model.type) {
            var geom = model.getGeometry();
            region.push(geom);
        }
    }

    setAttributes(follow, {
        'class': 'view-notification-follow button button-state'
    });

    follow.addEventListener('click', function(){
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
    var self = this,
        shell = self.shell,
        stdout = shell.stdout,
        terminal = shell.terminal,
        binder = self.binder,
        map = shell.env.map,
        display = terminal.display({fullscreen: true}),
        userId = self.getUser(),
        groupId = self.getGroup();

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

        showLookup(display.node);
        binder.getGroup(userId, groupId)
            .then(function(group){
                showGroupLegend(display.node, group);
            })
            .catch(function(err){
                console.error('getgroup', err);
            });

        listLayers(self, display.node);
        notifier(self, display.node);
        waendCredit(display.node);
    };

    return (new Promise(resolver));
}



module.exports = exports = {
    name: 'view',
    command: view
};
