/*
 * app/lib/commands/layer/drawLine.js
 *     
 * 
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 * 
 * License in LICENSE file at the root of the repository.
 *
 */

'use strict';

var _ = require('underscore'),
    Promise = require('bluebird'),
    paper = require('../../../vendors/paper');


function setupCanvas (container) {
    console.log('drawLine.setupCanvas', container.getAttribute('id'));
    var canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.backgroundColor = 'transparent';
    container.appendChild(canvas);
    paper.setup(canvas);
    paper.view.draw();
};

function drawLine () {
    var self = this,
        shell = self.shell,
        terminal = shell.terminal,
        display = terminal.display();

    setupCanvas(display.node);

    var resolver = function (resolve, reject) {
        // http://paperjs.org/examples/path-simplification/
        var path;
        var tool = new paper.Tool();
        
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
            path.simplify(10);
            console.log(path);
            var polyLineOrGon = undefined; // TODO populate


            tool.off('mousedown', onMouseDown);
            tool.off('mousedrag', onMouseDrag);
            tool.off('mouseup', onMouseUp);
            tool.remove();
            paper.project.remove();
            display.end();
            resolve(polyLineOrGon);
        };

        tool.on('mousedown', onMouseDown);
        tool.on('mousedrag', onMouseDrag);
        tool.on('mouseup', onMouseUp);
    };

    return (new Promise(resolver));
};


module.exports = exports = {
    name: 'line',
    command: drawLine
};