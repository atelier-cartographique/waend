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
    Transport = require('../Transport');

var API_URL = config.public.apiUrl;


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

function vecDist (v1, v2) {
    var dx = v2[0] - v1[0],
        dy = v2[1] - v1[1];
    return Math.sqrt((dx*dx) + (dy*dy));
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
    if (!this.select) {
        this.select = document.createElement('div');
        this.select.setAttribute('class', 'navigate-select');
        this.select.style.position = 'absolute';
        this.select.style.pointerEvents = 'none';
        this.select.style.display = 'none';
        this.navigator.options.container.appendChild(this.select);
    }

};


NavigatorModeBase.prototype.mousemove = function (event) {
    if (this.isStarted) {
        var sp = this.startPoint,
            hp = [event.clientX, event.clientY],
            extent = new Geometry.Extent(sp.concat(hp));
        extent.normalize();
        var tl = extent.getBottomLeft().getCoordinates();
        this.select.style.left = tl[0] + 'px';
        this.select.style.top = tl[1] + 'px';
        this.select.style.width = extent.getWidth() + 'px';
        this.select.style.height = extent.getHeight() + 'px';

        if (!this.isMoving) {
            this.isMoving = true;
            this.select.style.display = 'block';
        }

    }
};

NavigatorModeBase.prototype.mouseup = function (event) {
    if (this.isStarted) {
        var endPoint = [event.clientX, event.clientY],
            startPoint = this.startPoint,
            dist = vecDist(startPoint, endPoint);

        if (dist > 2) {
            var TI = this.navigator.transform.inverse(),
                extent = unprojectExtent(transformExtent(startPoint.concat(endPoint), TI));

            region.push(extent);
        }
        else {
            this.navigator.centerOn(startPoint);
        }
        this.isStarted = false;
        this.isMoving = false;
        this.select.style.display = 'none';
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
	lenght = right - left,
	hw = ((lenght - 1) / 2) + left,
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
    ctx.fillRect(left + 1, top + 1, (lenght / 2) - 1, (thickness / 2) - 1);
    ctx.fillRect(hw + 1, top + (thickness / 2), (lenght / 2) - 1, (thickness / 2) - 1);
    ctx.restore();
};

Navigator.prototype.draw = function (selected) {
    this.clear();
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
        title = document.createElement('div'),
        desc = document.createElement('div');

    wrapper.setAttribute('class', 'view-group-wrapper');
    title.setAttribute('class', 'view-group-title');
    desc.setAttribute('class', 'view-group-description');

    title.innerHTML = group.get('name', 'Title');
    desc.innerHTML = group.get('description', 'Description');

    wrapper.appendChild(title);
    wrapper.appendChild(desc);
    node.appendChild(wrapper);
}


function lookupResults(container) {
    var callback = function (data) {
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }
        if('results' in data) {
            for (var i = 0; i < data.results.length; i++) {
                var elem = document.createElement('div'),
                    anchor = document.createElement('a'),
                    result = data.results[i],
                    props = result.properties,
                    name = props.name || result.id,
                    ctxPath = '/' + result.user_id + '/' + result.id;

                elem.setAttribute('class', 'view-lookup-result');
                anchor.setAttribute('href', '/map' + ctxPath + '?c=view');
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
        input = document.createElement('input'),
        button = document.createElement('button'),
        results = document.createElement('div');

    wrapper.setAttribute('class', 'view-lookup-wrapper');
    input.setAttribute('class', 'view-lookup-input');
    button.setAttribute('class', 'view-lookup-search');
    results.setAttribute('class', 'view-lookup-results');

    button.innerHTML = "search";

    wrapper.appendChild(input);
    wrapper.appendChild(button);
    wrapper.appendChild(results);
    node.appendChild(wrapper);

    var lookup = function () {
        var term = input.value.trim();
        input.value = '';
        lookupTerm(term, lookupResults(results));
    };
    button.addEventListener('click', lookup, false);
}


function view () {
    var self = this,
        shell = self.shell,
        stdout = shell.stdout,
        terminal = shell.terminal,
        binder = self.binder,
        map = shell.env.map,
        display = terminal.display(),
        userId = self.getUser(),
        groupId = self.getGroup();

    terminal.hide();
    var options = {
        'container': display.node,
        'map': map
    };

    var nav = new Navigator(options);

    var resolver = function (resolve, reject) {

        var ender = function (extent) {
            display.end();
            terminal.show();
            resolve(extent);
        };

        nav.start(ender);

        showLookup(display.node);
        binder.getGroup(userId, groupId)
            .then(function(group){
                showGroupLegend(display.node, group);
            });

    };

    return (new Promise(resolver));
}


module.exports = exports = {
    name: 'view',
    command: view
};
