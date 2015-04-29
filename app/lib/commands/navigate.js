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

var _ = require('underscore'),
    Promise = require('bluebird'),
    Geometry = require('../Geometry'),
    Transform = require('../Transform'),
    region = require('../Region');

function isKeyReturnEvent (event) {
    return (13 === event.which || 13 === event.keyCode);
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

function navigate () {
    var self = this,
        shell = self.shell,
        stdout = shell.stdout,
        terminal = shell.terminal,
        map = shell.env.map,
        helpBlock = window.document.createElement('div');
        display = terminal.display();

    stdout.write('<class="hint">zoom in with [i]</>');
    stdout.write('<class="hint">zoom out with [o]</>');
    stdout.write('<class="hint">pan with arrow keys</>');
    stdout.write('<class="hint">any other key exits navigate mode</>');
    
    var navNorth = function () {
        var T = new Transform(),
            extent = region.get(),
            val = getStep(extent);

        T.translate(0, -val);
        transformRegion(T, extent);
    };

    var navSouth = function () {
        var T = new Transform(),
            extent = region.get(),
            val = getStep(extent);

        T.translate(0, val);
        transformRegion(T, extent);
    };

    var navEast = function () {
        var T = new Transform(),
            extent = region.get(),
            val = getStep(extent);

        T.translate(-val, 0);
        transformRegion(T, extent);
    };

    var navWest = function () {
        var T = new Transform(),
            extent = region.get(),
            val = getStep(extent);

        T.translate(val, 0);
        transformRegion(T, extent);
    };

    var zoomIn = function () {
        var extent = region.get(),
            val = getStep(extent);

        var newExtent = extent.buffer(-val);
        region.push(newExtent);
    };

    var zoomOut = function () {
        var extent = region.get(),
            val = getStep(extent);

        var newExtent = extent.buffer(val);
        region.push(newExtent);
    };

    var resolver = function (resolve, reject) {
        var dispatch = function (event) {
            var key = event.witch || event.keyCode;
            switch (key) {
                case 38:
                    navSouth();
                    break;
                case 40:
                    navNorth();
                    break;
                case 37:
                    navEast();
                    break;
                case 39:
                    navWest();
                    break;
                case 73: // i
                    zoomIn();
                    break;
                case 79: // o
                    zoomOut();
                    break;
                default:
                    display.end();
                    resolve(region.get());
            }
        };
        display.node.setAttribute('tabindex', -1);
        display.node.focus();
        display.node.addEventListener('keydown', dispatch, true);
    };

    return (new Promise(resolver));
}


module.exports = exports = {
    name: 'navigate',
    command: navigate
};
