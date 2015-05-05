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
    var dropbox = document.createElement('canvas');
    dropbox.style.width = '100%';
    dropbox.style.height = '100%';
    dropbox.backgroundColor = 'transparent';
    container.appendChild(dropbox);
    return dropbox;
}

function create (binder, uid, gid, lid, feature, batchJob) {
    var olGeom = feature.getGeometry();
    var props = _.omit(feature.getProperties(), 'geometry', 'id');
    var geomType = olGeom.getType();
    if(('Point' === geomType)
        || ('LineString' === geomType)
        || ('Polygon' === geomType)) {

        var geom = JSON.parse(Geometry.format.GeoJSON.write(olGeom));
        var data = {
            'user_id': uid,
            'layer_id': lid,
            'properties': props,
            'geom': geom
        };

        return binder.setFeature(uid, gid, lid, data, batchJob);
    }
    console.write('importer unsupported geom type', geomType);
    return Promise.resolve();
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

    stdout.write('<span class="hint first-hint-line">drag and drop your GeoJSON file on map to import it</span>');
    stdout.write('<span class="hint">IMPORTANT :</span>');
    stdout.write('<span class="hint">Wænd currently does not support</span>');
    stdout.write('<span class="hint">multilines and multipolygons</span>');
    stdout.write('<span class="hint">nor points -yeah!-</span>');
    stdout.write('<span class="hint">Projection should be EPGS:4326 - WGS84</span>');



    var dropbox = setupDropZone(display.node);

    var resolver = function (resolve, reject) {
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

          handleFile(files[0]);
        };

        var handleFile = function (file) {
            var reader = new FileReader();

            var creator = function (evt) {
                var geojson = evt.target.result,
                    features = Geometry.format.GeoJSON.readFeatures(geojson),
                    lastIndex = features.length - 1;

                Promise.reduce(features, function(total, item, index){
                        var feature = features[index],
                            lastOne = index === lastIndex;

                        return create(binder, uid, gid, lid, feature, !lastOne);
                    }, 0)
                    .then(function(){
                        resolve();
                    })
                    .catch(reject)
                    .finally(function(){
                        display.end();
                    });

            };
            reader.onload = creator;
            reader.readAsText(file);
        };

        dropbox.addEventListener("dragenter", dragenter, false);
        dropbox.addEventListener("dragover", dragover, false);
        dropbox.addEventListener("drop", drop, false);
    };

    return (new Promise(resolver));
}


module.exports = exports = {
    name: 'import',
    command: importer
};
