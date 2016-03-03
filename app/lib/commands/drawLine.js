/*
 * app/lib/commands/layer/drawLine.js
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
    semaphore = require('../Semaphore'),
    paper = require('../../vendors/paper'),
    helpers = require('../helpers');

var makeButton = helpers.makeButton,
    addClass = helpers.addClass;


function setupCanvas (container, view) {
    var canvas = document.createElement('canvas'),
        rect = view.getRect();

    // setup canvas properties
    canvas.setAttribute('class', 'tool-draw');
    canvas.style.position = 'absolute';
    canvas.width = rect.width;
    canvas.height = rect.height;
    canvas.style.top = rect.top + 'px';
    canvas.style.left = rect.left + 'px';
    canvas.backgroundColor = 'transparent';
    
    // 
    container.appendChild(canvas);
    paper.setup(canvas);
    paper.view.draw();

    semaphore.on('view:resize', function () {
        var vrect = view.getRect();
        canvas.width = vrect.width;
        canvas.height = vrect.height;
        canvas.style.top = vrect.top + 'px';
        canvas.style.left = vrect.left + 'px';
    }, this);
}

function insertLeftPannel (container, closer) {
    var wrapper = document.createElement('div'),
        infos = document.createElement('div'),
        button = makeButton('Cancel', {}, closer);

        infos.innerHTML = 'Click and hold to draw on map';
        addClass(wrapper, 'widget-block-left');
        addClass(button, 'push-buttons push-cancel');


    wrapper.appendChild(infos);
    wrapper.appendChild(button);
    container.appendChild(wrapper);
}

function drawLine () {
    var self = this,
        shell = self.shell,
        stdout = shell.stdout,
        terminal = shell.terminal,
        map = shell.env.map,
        display = terminal.display();

    setupCanvas(display.node, map.getView());

    var resolver = function (resolve, reject) {
        var path,
            points =[],
            tool = new paper.Tool();

        var closer = function (arg) {
            display.end();
            if (arg) {
                return resolve(arg);
            }
            reject('Cancelled');
        };


        var onMouseDown = function (event) {
            path = new paper.Path({
                segments: [event.point],
                strokeColor: 'black',
                fullySelected: true
            });
        };

        var onMouseDrag = function (event) {
            path.add(event.point);
        };

        var onMouseUp = function (event) {
            var segmentCount = path.segments.length;
            console.log(path);
            var polyLineOrGon; // TODO populate
            if (path.closed) {
                console.log('errr not implemted');
            }
            else {
                var line = new Geometry.LineString([]);
                var segments = path.segments;
                for (var i = 0; i < segments.length; i++) {
                    var s = segments[i],
                        pixel = [s.point.x, s.point.y];
                    line.appendCoordinate(map.getCoordinateFromPixel(pixel));
                }
            }

            tool.off('mousedown', onMouseDown);
            tool.off('mousedrag', onMouseDrag);
            tool.off('mouseup', onMouseUp);
            tool.remove();

            paper.project.remove();
            closer(line);
        };

        insertLeftPannel(display.node, closer);
        tool.on('mousedown', onMouseDown);
        tool.on('mousedrag', onMouseDrag);
        tool.on('mouseup', onMouseUp);
    };

    return (new Promise(resolver));
}


module.exports = exports = {
    name: 'draw',
    command: drawLine
};
