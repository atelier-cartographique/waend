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

var _ = require('underscore'),
    Promise = require('bluebird'),
    Geometry = require('../../Geometry');



function setupDropZone (container) {
    var dropbox = document.createElement('div'),
        dropboxLabel = document.createElement('div');
    dropbox.setAttribute('class', 'importer-dropzone');
    dropboxLabel.setAttribute('class', 'importer-dropzone-label');

    dropboxLabel.innerHTML = 'Drop Zone';

    dropbox.appendChild(dropboxLabel);
    container.appendChild(dropbox);
    return dropbox;
}

function setupInput (container) {
    var input = document.createElement('input'),
        inputWrapper = document.createElement('div');
    inputWrapper.setAttribute('class', 'importer-input-wrapper');
    input.setAttribute('class', 'importer-input');
    input.setAttribute('type', 'file');
    container.appendChild(input);
    return input;
}


function setupHints (container) {
    var hints = document.createElement('div');
    hints.setAttribute('class', 'importer-hints');
    hints.innerHTML = [
        '<p class="hint first-hint-line">drag and drop your GeoJSON file on map to import it</p>'
        ,'<p class="hint">IMPORTANT :</p>'
        ,'<p class="hint">Wænd currently does not support</p>'
        ,'<p class="hint">multilines and multipolygons</p>'
        ,'<p class="hint">nor points -yeah!-</p>'
        ,'<p class="hint">Projection should be EPGS:4326 - WGS84</p>'
    ].join(' ');
    container.appendChild(hints);
}


function setupCancel (container) {
    var cancel = document.createElement('div');
    cancel.setAttribute('class', 'importer-cancel');
    cancel.innerHTML = 'cancel';
    container.appendChild(cancel);
    return cancel;
}



var createData = {
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

function create (feature, batchJob) {
    var olGeom = feature.getGeometry();
    var props = _.omit(feature.getProperties(), 'geometry', 'id');
    var geomType = olGeom.getType();
    if(('LineString' === geomType) || ('Polygon' === geomType)) {
        var geom = JSON.parse(Geometry.format.GeoJSON.write(olGeom));
        var data = {
            'user_id': createData.uid,
            'layer_id': createData.lid,
            'properties': props,
            'geom': geom
        };

        return createData.binder.setFeature(
            createData.uid, createData.gid, createData.lid,
            data, batchJob
            );
    }
    console.error('importer unsupported geom type', geomType);
    return Promise.resolve();
}

function progress (length, index, options, feature) {
    if (!options.progess) {
        var container = options.container;
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

        options.progress.total.innerHTML = length + ' features to import';

        options.progress.appendChild(options.progress.total);
        options.progress.appendChild(options.progress.counter);
        options.progress.appendChild(options.progress.featureInfo);
        container.appendChild(options.progress);
    }

    options.progress.counter.innerHTML = index.toString();
    // var props = _.omit(feature.getProperties(), 'geometry');

}


var handleFile = function (file, options, resolve, reject) {
    var reader = new FileReader();

    var creator = function (evt) {
        var geojson = evt.target.result,
            features = Geometry.format.GeoJSON.readFeatures(geojson),
            lastIndex = features.length - 1;

        Promise.reduce(features, function(total, item, index, arrayLength){
                var feature = features[index],
                    lastOne = index === lastIndex;
                progress (arrayLength, index, options, feature);
                return create(feature, !lastOne);
            }, 0)
            .then(function(){
                resolve();
            })
            .catch(reject)
            .finally(function(){
                options.display.end();
            });

    };
    reader.onload = creator;
    reader.readAsText(file);
};

function resolver (options) {
    return function (resolve, reject) {

        // Drag & Drop
        var dragenter = function (e) {
          e.stopPropagation();
          e.preventDefault();
        };

        var dragover = function (e) {
          e.stopPropagation();
          e.preventDefault();
        };

        var drop = function (e) {
          e.stopPropagation();
          e.preventDefault();

          var dt = e.dataTransfer;
          var files = dt.files;

          handleFile(files[0], options.container,
              resolve, reject);
        };

        options.dropbox.addEventListener("dragenter", dragenter, false);
        options.dropbox.addEventListener("dragover", dragover, false);
        options.dropbox.addEventListener("drop", drop, false);


        // Select

        options.input.addEventListener('change', function (e) {
            (function () {
                handleFile(options.input.files[0], options,
                    resolve, reject);
            })();
        }, false);

        // Cancel
        options.cancel.addEventListener('click', function () {
            options.display.end();
            reject('Cancel');
        }, false);

    };
}

function importer () {
    var self = this,
        shell = self.shell,
        stdout = shell.stdout,
        binder = self.binder,
        terminal = shell.terminal,
        map = shell.env.map,
        current = self.current(),
        uid = current[0],
        gid = current[1],
        lid = current[2],
        display = terminal.display();

    setupCreateData(binder, uid, gid, lid);
    setupHints(display.node);
    var input = setupInput(display.node);
    var dropbox = setupDropZone(display.node);
    var cancel = setupCancel(display.node);
    var options = {
        'input': input,
        'dropbox': dropbox,
        'container': display.node,
        'display': display,
        'cancel': cancel
    };
    return (new Promise(resolver(options)));
}


module.exports = exports = {
    name: 'import',
    command: importer
};
