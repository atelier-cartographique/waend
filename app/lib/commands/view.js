/*
 * app/lib/commands/view.js
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
    turf = require('turf'),
    config = require('../../../config'),
    Transport = require('../Transport'),
    helpers = require('../helpers');

var API_URL = config.public.apiUrl;


var Proj3857 = Projection('EPSG:3857');

var projectExtent = helpers.projectExtent,
    unprojectExtent = helpers.unprojectExtent,
    transformExtent = helpers.transformExtent,
    vecDist = helpers.vecDist;

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
    this.startPoint = [event.clientX, event.clientY];
    this.isStarted = true;
    // if (!this.select) {
    //     this.select = document.createElement('div');
    //     this.select.setAttribute('class', 'navigate-select');
    //     this.select.style.position = 'absolute';
    //     this.select.style.pointerEvents = 'none';
    //     this.select.style.display = 'none';
    //     this.navigator.options.container.appendChild(this.select);
    // }

};


NavigatorModeBase.prototype.mousemove = function (event) {
    if (this.isStarted) {
        var sp = this.startPoint,
            hp = [event.clientX, event.clientY],
            extent = new Geometry.Extent(sp.concat(hp)),
            ctx = this.navigator.context;
        extent.normalize();
        var tl = extent.getBottomLeft().getCoordinates();
        if (this.previewImageData) {
            ctx.save();
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            ctx.putImageData(this.previewImageData, hp[0] - sp[0], hp[1] - sp[1]);
            ctx.restore();
        }
        if (!this.isMoving) {
            this.isMoving = true;
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            this.previewImageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
            var data = this.previewImageData.data;
            this.navigator.map.getView()
                .forEachImage(function(imageData){
                    var thisData = imageData.data,
                        alpha;
                    for (var i = 0; i < data.length; i += 4) {
                        alpha = thisData[i + 3] / 255,
                            r = i,
                            g = i + 1,
                            b = i + 2;
                        if (alpha > 0) {
                            data[r] = (data[r] * (1 - alpha)) + (thisData[r] * alpha);
                            data[g] = (data[g] * (1 - alpha)) + (thisData[g] * alpha);
                            data[b] = (data[b] * (1 - alpha)) + (thisData[b] * alpha);
                        }
                    }
                });

        }

    }
};

NavigatorModeBase.prototype.mouseup = function (event) {
    if (this.isStarted) {
        var endPoint = [event.clientX, event.clientY],
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
    // this.canvas.focus();
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

    var left = 13,
        right = 74,
        top = rect.height - 17,
	thickness = 6,
        bottom = top + thickness,
	length = right - left,
	hw = ((length - 1) / 2) + left,
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
    // this.drawScale();
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


    titleWrapper.appendChild(titleLabel);
    titleWrapper.appendChild(title);
    wrapper.appendChild(descLabel);
    wrapper.appendChild(desc);
    wrapper.appendChild(titleWrapper);
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

                elem.setAttribute('class', 'view-lookup-result');
                anchor.setAttribute('href', '/view' + ctxPath);
                anchor.innerHTML = name;
                elem.appendChild(anchor);
                container.appendChild(elem);
            }
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
    results.setAttribute('class', 'view-lookup-results');

    button.innerHTML = "lookup";

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
var waendCredit = document.createElement('div');
    waendCredit.setAttribute('class', 'credit-waend');

    waendCreditLink = document.createElement('a');
    waendCreditLink.setAttribute('href', 'http://waend.com');
    waendCreditLink.setAttribute('target', 'blank');
    waendCreditLink.innerHTML = 'wænd.com';

    waendCreditLinkToLogin = document.createElement('a');
    waendCreditLinkToLogin.setAttribute('href', 'http://alpha.waend.com');
    waendCreditLinkToLogin.setAttribute('target', 'blank');
    waendCreditLinkToLogin.innerHTML = ' • login • ';

    waendCreditLinkToRegister = document.createElement('a');
    waendCreditLinkToRegister.setAttribute('href', 'http://alpha.waend.com/register');
    waendCreditLinkToRegister.setAttribute('target', 'blank');
    waendCreditLinkToRegister.innerHTML = 'register';

    waendCredit.appendChild(waendCreditLink);
    waendCredit.appendChild(waendCreditLinkToLogin);
    waendCredit.appendChild(waendCreditLinkToRegister);
    node.appendChild(waendCredit);
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
        waendCredit(display.node);
    };

    return (new Promise(resolver));
}



module.exports = exports = {
    name: 'view',
    command: view
};
