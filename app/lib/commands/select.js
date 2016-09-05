/*
 * app/lib/commands/select.js
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
import Transform from '../Transform';
import region from '../Region';
import {getModelName} from '../helpers';


function transformRegion (T, opt_extent) {
    const extent = opt_extent.extent;
    const NE = T.mapVec2([extent[2], extent[3]]);
    const SW = T.mapVec2([extent[0], extent[1]]);
    const newExtent = [SW[0], SW[1], NE[0], NE[1]];
    region.push(newExtent);
}


function getMouseEventPos (ev, view) {
    if (ev instanceof MouseEvent) {
        const target = ev.target;
        const vrect = view.getRect();
        return [
            ev.clientX - vrect.left,
            ev.clientY - vrect.top
        ];
    }
    return [0, 0];
}


function select () {
    const self = this;
    const stdout = self.sys.stdout;
    const shell = self.shell;
    const terminal = shell.terminal;
    const map = shell.env.map;
    const display = terminal.display();

    const makeOutput = feature => terminal.makeCommand({
        fragment: feature.getDomFragment('name'),
        text: getModelName(feature),
        args: [
            `cc /${feature.getPath().join('/')}`,
            'gg | region set'
        ]
    });


    const resolver = (resolve, reject) => {
        const innerSelect = event => {
            const pos = getMouseEventPos(event, map.getView());
            const clientPosMin = [pos[0] -1, pos[1] - 1];
            const clientPosMax = [pos[0] + 1, pos[1] + 1];
            const mapPosMin = map.getCoordinateFromPixel(clientPosMin);
            const mapPosMax = map.getCoordinateFromPixel(clientPosMax);
            const features = map.getFeatures(mapPosMin.concat(mapPosMax));
            display.end();
            if (features) {
                // resolve(features[0]);
                for (const f of features) {
                    if (f) {
                        stdout.write(makeOutput(f));
                    }
                }

                resolve(features);
            }
            else {
                reject('NothingSelected');
            }
        };
        display.node.addEventListener('click', innerSelect, true);
    };

    return (new Promise(resolver));
}


export default {
    name: 'select',
    command: select
};
