/**
 * scripts/seed-index.js
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 */



var config = require('../config'),
    db = require('../lib/db'),
    indexer = require('../lib/indexer'),
    models = require('../lib/models');

db.configure(config.pg);
indexer.configure(config.solr);


var client = {
    db: db.client(),
    indexer: indexer.client()
};

var compositions = {};


function processFeature (type) {
    return function (results) {
        console.log('process' + type, results.length);
        if (results) {
            var batchSz = 512,
                len = results.length + batchSz;
            for (var i = 0; i < len; i += batchSz) {
                var stop = i + batchSz,
                    ms = [],
                    groups = [];
                for (var j = i; j < stop; j++) {
                    if (!results[j]) {
                        break;
                    }
                    var f = models[type].buildFromPersistent(results[j]),
                        lid = f.layer_id,
                        gids = compositions[lid] || [];
                    ms.push(f);
                    groups.push(gids);
                }
                client.indexer.updateBatch('layer', groups, ms);
            }
        }
    };
}

function loadFeature (type) {
    return function () {
        console.log('load' + type);
        return client.db.query(type + 'Load', []);
    };
}

function processLayers (results) {
    console.log('processLayers', results.length);
    var batchSz = 126,
        len = results.length + batchSz;
    for (var i = 0; i < len; i += batchSz) {
        var stop = i + batchSz,
            ms = [],
            groups = [];
        for (var j = i; j < stop; j++) {
            if (!results[j]) {
                break;
            }
            var l = models.layer.buildFromPersistent(results[j]),
                lid = l.id,
                gids = compositions[lid] || [];

            ms.push(l);
            groups.push(gids);
        }
        client.indexer.updateBatch('layer', groups, ms);
    }
}

function loadLayers () {
    console.log('loadLayers');
    return client.db.query('layerLoad', []);
}


function processGroups (results) {
    console.log('processGroups');
    for (var i = 0; i < results.length; i++) {
        var g = models.group.buildFromPersistent(results[i]);

        client.indexer.update('group', [g.id], g);
    }
}


function loadGroups () {
    console.log('loadGroups');
    return client.db.query('groupLoad', []);
}


function processCompositions (results) {
    console.log('processCompositions');
    for (var i = 0; i < results.length; i++) {
        var compo = models.composition.buildFromPersistent(results[i]);
        if (!(compo.layer_id in compositions)) {
            compositions[compo.layer_id] = [];
        }
        compositions[compo.layer_id].push(compo.group_id);
    }
}

function loadCompositions () {
    return client.db
      .query('compositionLoad', [])
      .then(processCompositions)
      .then(loadFeature('entity'))
      .then(processFeature('entity'))
      .then(loadFeature('path'))
      .then(processFeature('path'))
      .then(loadFeature('spread'))
      .then(processFeature('spread'))
      .then(loadLayers)
      .then(processLayers)
      .then(loadGroups)
      .then(processGroups);
}

var start = Date.now();
loadCompositions()
.then(function(){
    var t = Math.ceil((Date.now() - start) / 1000);
    console.log('Done in', t, 'seconds');
});
// .catch(function(err){
//     console.error(err);
//     throw (new Error(err));
// });
