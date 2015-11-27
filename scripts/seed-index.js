/**
 * scripts/seed-index.js
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 */



var _ = require('underscore'),
    config = require('../config'),
    db = require('../lib/db'),
    indexer = require('../lib/indexer'),
    models = require('../lib/models');

db.configure(config.pg);
indexer.configure(config.solr);

var batchSize = 512;

var client = {
    db: db.client(),
    indexer: indexer.client()
};

function log (what) {
    return function (err) {
        console.log(what, err);
    };
}

function processFeature (type, context, done) {

    return function (results) {
        if (results && (results.length > 0)) {
            console.log('process', type, results.length);
            var ms = [],
                groups = [];
            for (var i = 0; i < results.length; i++) {
                var f = models[type].buildFromPersistent(results[i]),
                    lid = f.layer_id,
                    gids = context.compositions[lid] || [];
                ms.push(f);
                groups.push(gids);
            }

            client.indexer.updateBatch(type, groups, ms)
                .catch(log('proce feat error'))
                .finally(function(){
                    context.taskState.pending = false;
                });
        }
        else {
            done();
        }
    };
}

function loadFeature (type) {
    return function (context, done) {
        var state = context.taskState;
        if (!state.started) {
            console.log('START', type);
            state.started = true;
            state.pending = true;
            state.offset = 0;
            client.db.query(type + 'LoadPart', [state.offset, batchSize])
                .then(processFeature(type, context, done));
        }
        else {
            if (!state.pending) {
                state.pending = true;
                state.offset += batchSize;
                console.log('CONT', type, state.offset);
                client.db.query(type + 'LoadPart', [state.offset, batchSize])
                    .then(processFeature(type, context, done));
            }
        }
    };
}

function processLayers (context, done, results) {
    if (results && (results.length > 0)) {
        var ms = [],
            groups = [];
        for (var i = 0; i < results.length; i++) {
            var f = models.layer.buildFromPersistent(results[i]),
                lid = f.layer_id,
                gids = context.compositions[lid] || [];
            ms.push(f);
            groups.push(gids);
        }

        client.indexer.updateBatch('layer', groups, ms)
            .catch(log('proce layer error'))
            .finally(function(){
                context.taskState.pending = false;
            });
    }
    else {
        done();
    }
}



function processGroups (context, done, results) {
    if (results && (results.length > 0)) {
        console.log('processGroups', results.length);
        var ms = [],
            groups = [];

        for (var i = 0; i < results.length; i++) {
            var g = models.group.buildFromPersistent(results[i]),
                gids = context.compositions[g.id];

            ms.push(g);
            groups.push(gids);
        }

        client.indexer.updateBatch('group', groups, ms)
            .catch(log('process group error'))
            .finally(function(){
                context.taskState.pending = false;
            });
    }
    else {
        done();
    }
}

function processCompositions (context, done, results) {
    if (results && (results.length > 0)) {
        context.compositions = context.compositions || {};
        console.log('processCompositions', results.length);
        for (var i = 0; i < results.length; i++) {
            var compo = models.composition.buildFromPersistent(results[i]);
            if (!(compo.layer_id in context.compositions)) {
                context.compositions[compo.layer_id] = [];
            }
            context.compositions[compo.layer_id].push(compo.group_id);
        }
        context.taskState.pending = false;
    }
    else {
        done();
    }
}

function loader (qname, processor) {
    return function (context, done) {
        var state = context.taskState;
        var partial = _.partial(processor, context, done);
        if (!state.started) {
            state.started = true;
            state.pending = true;
            state.offset = 0;
            client.db.query(qname, [state.offset, batchSize])
                .then(partial);
        }
        else {
            if (!state.pending) {
                state.pending = true;
                state.offset += batchSize;
                client.db.query(qname, [state.offset, batchSize])
                    .then(partial);
            }
        }
    };
}


function taskRunner (tasks) {
    var context = {},
        itv;

    function resetTaskState () {
        context.taskState = {
            started: false,
            pending: false
        };
    }

    function done () {
        resetTaskState();
        tasks.shift();
        if (0 === tasks.length) {
            clearInterval(itv);
        }
    }

    function run () {
        var task = tasks[0];
        task(context, done);
    }

    resetTaskState();
    itv = setInterval(run, 10);
}


var tasks = [
    loader('compositionLoadPart', processCompositions),
    loadFeature('entity'),
    loadFeature('path'),
    loadFeature('spread'),
    loader('layerLoadPart', processLayers),
    loader('groupLoadPart', processGroups)
];

taskRunner(tasks);
