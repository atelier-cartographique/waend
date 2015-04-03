/*
 * app/src/wmap.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */


var workerContext = self;
workerContext.window = {};
workerContext.window.document = {
    'implementation':{
        'createDocument': function () { return true; }
    }
};
workerContext.document = workerContext.window.document;

workerContext.Image = function Image() {};

var underscore = require('underscore'),
    Geometry = require('../lib/Geometry'),
    Transform = require('../lib/Transform'),
    Projection = require('proj4');

var Proj3857 = Projection('EPSG:3857');

var polygonTransform = function (coordinates) {
    for (var i = 0; i < coordinates.length; i++) {
        var ringLength = coordinates[i].length;
        for (var ii = 0; ii < ringLength; ii++) {
            coordinates[i][ii] = Proj3857.forward(coordinates[i][ii]);
        }
    }
};

var lineTransform = function (coordinates) {
    for (var i = 0; i < coordinates.length; i++) {
        coordinates[i] = Proj3857.forward(coordinates[i]);
    }
};


workerContext.waend = {
    'Projection': Projection,
    'Geometry': Geometry,
    'Transform': Transform,
    'proj3857': Proj3857,
    'polygonTransform' : polygonTransform,
    'lineTransform': lineTransform
};

function messageHandler (event) {
    var data = event.data,
        name = data.name,
        args = data.args || [];
    if (name && (name in workerContext.waend)) {
        workerContext.waend[name].apply(workerContext, args);
    }
}

workerContext.addEventListener('message', messageHandler, false);

function emit () {
    var args = [];

    if(0 === arguments.length) {
        return;
    }

    for (var i = 0; i < arguments.length; i++) {
        args.push(arguments[i]);
    }

    workerContext.postMessage(args);
}

workerContext.waend.emit = emit;
