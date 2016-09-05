/*
 * app/lib/commands/group/listLayers.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */


import _ from 'underscore';

import region from '../../Region';
import {getModelName, layerExtent} from '../../helpers';


function listLayers () {
    const self = this;
    const current = self.current();
    const userId = current[0];
    const groupId = current[1];
    const shell = self.shell;
    const stdout = self.sys.stdout;
    const binder = self.binder;
    const terminal = shell.terminal;

    const makeOutput = layer => {
        const fragment = document.createElement('div');
        const zoomer = document.createElement('div');
        const label = layer.getDomFragment('name');

        zoomer.setAttribute('class', 'll-zoomer icon-setmapextent');
        zoomer.innerHTML = '';
        zoomer.addEventListener('click', () => {
            layerExtent(layer)
                .then(_.bind(region.push, region))
                .catch(err => {console.error(err)});
        }, false);

        label.addEventListener('click', () => {
            terminal.runCommand(`cc /${userId}/${groupId}/${layer.id}`);
        }, false);

        fragment.appendChild(zoomer);
        fragment.appendChild(label);
        return terminal.makeCommand({
            fragment,
            text: getModelName(layer)
        });
    };


    const res = (resolve, reject) => {
        binder.getLayers(userId, groupId)
            .then(layers => {
                for(let i = 0; i < layers.length; i++){
                    stdout.write(
                        makeOutput(layers[i])
                    );
                }
                resolve(_.map(layers, l => l.id));
            })
            .catch(reject);
    };
    return (new Promise(res));
}


export default {
    name: 'listLayers',
    command: listLayers
};
