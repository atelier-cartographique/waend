/*
 * app/lib/commands/layer/importer.js
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
    Geometry = require('../../Geometry');


function setupDropZone (container) {
    var dropbox = document.createElement('canvas');
    dropbox.style.width = '100%';
    dropbox.style.height = '100%';
    dropbox.backgroundColor = 'transparent';
    container.appendChild(dropbox);
    return dropbox;
};

function create (binder, uid, gid, lid, feature) {
    var olGeom = feature.getGeometry();
    var geomType = olGeom.getType();
    if(('Point' === geomType) 
        || ('LineString' === geomType) 
        || ('Polygon' === geomType)) {

        var geom = JSON.parse(Geometry.format.GeoJSON.write(olGeom));
        var data = {
            'user_id': uid,
            'layer_id': lid,
            'properties': {},
            'geom': geom
        }
        return binder.setFeature(uid, gid, lid, data);
    }
    console.write('importer unsupported geom type', geomType);
    return Promise.resolve();
};

function importer () {
    var self = this,
        shell = self.shell,
        terminal = shell.terminal,
        map = shell.env.map,
        current = self.current(),
        uid = current[0],
        gid = current[1],
        lid = current[2],
        display = terminal.display();

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
                    features = Geometry.format.GeoJSON.readFeatures(geojson);;

                Promise.reduce(features, function(total, item, index){
                        var feature = features[index];
                        return create(binder, uid, gid, lid, feature);
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
};


module.exports = exports = {
    name: 'import',
    command: importer
};