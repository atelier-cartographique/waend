/*
 * app/lib/commands/layer/importer.js
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
import Geometry from '../../Geometry';
import {reducePromise} from '../../helpers';



function setupDropZone (container) {
    const dropbox = document.createElement('div');
    const dropboxLabel = document.createElement('div');
    dropbox.setAttribute('class', 'importer-dropzone');
    dropboxLabel.setAttribute('class', 'importer-dropzone-label');

    dropboxLabel.innerHTML = '-IMPORT DATAS- Drag & drop your GeoJSON here, or select a file';

    dropbox.appendChild(dropboxLabel);
    container.appendChild(dropbox);
    return dropbox;
}

function setupInput (container) {
    const input = document.createElement('input');
    const inputWrapper = document.createElement('div');
    inputWrapper.setAttribute('class', 'importer-input-wrapper');
    input.setAttribute('class', 'importer-input');
    input.setAttribute('type', 'file');
    container.appendChild(input);
    return input;
}


function setupHints (container) {
    const hints = document.createElement('div');
    hints.setAttribute('class', 'importer-hints');
    hints.innerHTML = [
        '<span class="hint">Help : <a href="http://alpha.waend.com/documentation/help.html#import" target="_blank">Import Datas</a></span>'
    ].join(' ');
    container.appendChild(hints);
}


function setupCancel (container) {
    const cancel = document.createElement('button');
    cancel.setAttribute('class', 'importer-cancel push-cancel');
    cancel.innerHTML = 'cancel';
    container.appendChild(cancel);
    return cancel;
}



const createData = {
    'binder': null,
    'uid': null,
    'gid': null,
    'lid': null
};

function setupCreateData (binder, uid, gid, lid) {
    createData.binder = binder;
    createData.uid = uid;
    createData.gid = gid;
    createData.lid = lid;
}

function create (feature) {
    const geom = new Geometry.Geometry(feature);
    const props = _.omit(feature.properties || {}, 'id');
    const geomType = geom.getType();
    if(('LineString' === geomType) || ('Polygon' === geomType)) {
        const data = {
            'user_id': createData.uid,
            'layer_id': createData.lid,
            'properties': props,
            'geom': geom.toGeoJSON()
        };

        return createData.binder.setFeature(
            createData.uid, createData.gid, createData.lid,
            data, true
            );
    }
    console.error('importer unsupported geom type', geomType);
    return Promise.resolve();
}

function progress (length, index, options, feature) {
    if (!options.progess) {
        const container = options.container;
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }
        options.progress = document.createElement('div');
        options.progress.total = document.createElement('div');
        options.progress.counter = document.createElement('div');
        options.progress.featureInfo = document.createElement('div');

        options.progress.setAttribute('class', 'importer-progress');
        options.progress.total.setAttribute('class', 'importer-total');
        options.progress.counter.setAttribute('class', 'importer-counter');
        options.progress.featureInfo.setAttribute('class', 'importer-feature');

        options.progress.total.innerHTML = `${length} features to import`;

        options.progress.appendChild(options.progress.total);
        options.progress.appendChild(options.progress.counter);
        options.progress.appendChild(options.progress.featureInfo);
        container.appendChild(options.progress);
    }

    options.progress.counter.innerHTML = index.toString();
    // var props = _.omit(feature.getProperties(), 'geometry');

}


const handleFile = (file, options, resolve, reject) => {
    const reader = new FileReader();

    const creator = evt => {
        const geojsonString = evt.target.result;
        let geojson;
        try {
            geojson = JSON.parse(geojsonString);
        }
        catch (err) {
            return reject('NotJSONParsable');
        }
        if (!('features' in geojson)) {
            return reject('NoFeatures');
        }

        const features = geojson.features;
        const lastIndex = features.length - 1;

        reducePromise(features, (total, item, index, arrayLength) => {
            const feature = features[index];
            const lastOne = index === lastIndex;
            progress (arrayLength, index, options, feature);
            return create(feature);
        }, 0)
            .then(() => {
                resolve();
            })
            .catch(reject)
            .finally(() => {
                options.display.end();
                createData.binder.changeParent(createData.lid);
            });
    };
    reader.onload = creator;
    reader.readAsText(file);
};

function resolver (options) {
    return (resolve, reject) => {

        // Drag & Drop
        const dragenter = e => {
          e.stopPropagation();
          e.preventDefault();
        };

        const dragover = e => {
          e.stopPropagation();
          e.preventDefault();
        };

        const drop = e => {
          e.stopPropagation();
          e.preventDefault();

          const dt = e.dataTransfer;
          const files = dt.files;

          handleFile(files[0], options, resolve, reject);
        };

        options.dropbox.addEventListener("dragenter", dragenter, false);
        options.dropbox.addEventListener("dragover", dragover, false);
        options.dropbox.addEventListener("drop", drop, false);


        // Select

        options.input.addEventListener('change', e => {
            ((() => {
                handleFile(options.input.files[0], options,
                    resolve, reject);
            }))();
        }, false);

        // Cancel
        options.cancel.addEventListener('click', () => {
            options.display.end();
            reject('Cancel');
        }, false);

    };
}

function importer () {
    const self = this;
    const shell = self.shell;
    const stdout = shell.stdout;
    const binder = self.binder;
    const terminal = shell.terminal;
    const map = shell.env.map;
    const current = self.current();
    const uid = current[0];
    const gid = current[1];
    const lid = current[2];
    const display = terminal.display();

    setupCreateData(binder, uid, gid, lid);
    const dropbox = setupDropZone(display.node);
    const input = setupInput(display.node);
    const cancel = setupCancel(display.node);
    const options = {
        'dropbox': dropbox,
        'container': display.node,
        'display': display,
        'input': input,
        'cancel': cancel
    };
    setupHints(display.node);

    return (new Promise(resolver(options)));
}


export default {
    name: 'import',
    command: importer
};
