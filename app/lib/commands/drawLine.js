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

import _ from 'underscore';

import Promise from 'bluebird';
import Geometry from '../Geometry';
import semaphore from '../Semaphore';
import paper from '../../vendors/paper';
import {makeButton, addClass} from '../helpers';
import debug from 'debug';
const logger = debug('waend:command:drawLine');

function setupCanvas (container, view) {
    const canvas = document.createElement('canvas');
    const rect = view.getRect();

    // setup canvas properties
    canvas.setAttribute('class', 'tool-draw');
    canvas.style.position = 'absolute';
    canvas.width = rect.width;
    canvas.height = rect.height;
    canvas.style.top = `${rect.top}px`;
    canvas.style.left = `${rect.left}px`;
    canvas.backgroundColor = 'transparent';

    //
    container.appendChild(canvas);
    paper.setup(canvas);
    paper.view.draw();

    semaphore.on('view:resize', () => {
        const vrect = view.getRect();
        canvas.width = vrect.width;
        canvas.height = vrect.height;
        canvas.style.top = `${vrect.top}px`;
        canvas.style.left = `${vrect.left}px`;
    }, this);
}

function insertLeftPannel (container, closer) {
    const wrapper = document.createElement('div');
    const infos = document.createElement('div');
    const button = makeButton('Cancel', {}, closer);

    infos.innerHTML = 'Click and hold to draw on map';
    addClass(wrapper, 'widget-block-left');
    addClass(button, 'push-buttons push-cancel');


    wrapper.appendChild(infos);
    wrapper.appendChild(button);
    container.appendChild(wrapper);
}

function drawLine () {
    const self = this;
    const shell = self.shell;
    const stdout = shell.stdout;
    const terminal = shell.terminal;
    const map = shell.env.map;
    const display = terminal.display();

    setupCanvas(display.node, map.getView());

    const resolver = (resolve, reject) => {
        let path;
        const points =[];
        const tool = new paper.Tool();

        const endPaper = () => {
            tool.off('mousedown', onMouseDown);
            tool.off('mousedrag', onMouseDrag);
            tool.off('mouseup', onMouseUp);
            tool.remove();
            paper.project.remove();
        };

        const closeOk = arg => {
            endPaper();
            display.end();
            resolve(arg);
        };
        const closeCancel = () => {
            endPaper();
            display.end();
            reject('Cancelled');
        };


        var onMouseDown = event => {
            path = new paper.Path({
                segments: [event.point],
                strokeColor: 'black',
                fullySelected: true
            });
        };

        var onMouseDrag = event => {
            path.add(event.point);
        };

        var onMouseUp = event => {
            const segmentCount = path.segments.length;
            logger(path);
            let polyLineOrGon; // TODO populate
            if (path.closed) {
                logger('errr not implemted');
            }
            else {
                var line = new Geometry.LineString([]);
                const segments = path.segments;

                for (const s of segments) {
                    line.appendCoordinate(map.getCoordinateFromPixel(pixel));
                }
            }
            closeOk(line);
        };

        insertLeftPannel(display.node, closeCancel);
        tool.on('mousedown', onMouseDown);
        tool.on('mousedrag', onMouseDrag);
        tool.on('mouseup', onMouseUp);
    };

    return (new Promise(resolver));
}


export default {
    name: 'draw',
    command: drawLine
};
