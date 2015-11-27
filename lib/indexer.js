/**
 lib/indexer.js

 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 */



var _ = require('underscore'),
    solr = require('solr-client');



function Indexer (solrClient) {
    this.client = solrClient;
}

Indexer.prototype.update = function (type, groups, model) {
    var client = this.client,
        props = model.properties,
        content = [];

    _.each(props, function(v, k){
        if (_.isString(v)) {
            content.push(k);
            content.push(v);
        }
    });

    var doc = {
        id: model.id,
        type: type,
        groups: groups || [],
        name: props.name || props.id,
        description: props.description || '',
        content: content.join('\n').toLowerCase()
    };

    client.add([doc], function(err){
        if (err) {
            console.error(err);
        }
        else {
            client.commit();
        }
    });
};

Indexer.prototype.updateBatch = function (type, groups, models) {
    var client = this.client,
        docs = [];

    var content;
    var makeContent = function(v, k){
        if (_.isString(v)) {
            content.push(k);
            content.push(v);
        }
    };
    console.log('indexer.batch', models.length, groups.length);
    for (var i = 0; i < models.length; i++) {
        var model = models[i],
            gids = groups[i],
            props = model.properties;

        content = [];
        _.each(props, makeContent);

        var doc = {
            id: model.id,
            type: type,
            groups: gids || [],
            name: props.name || props.id,
            description: props.description || '',
            content: content.join('\n').toLowerCase()
        };

        docs.push(doc);
    }
    if (docs.length > 0) {
        client.add(docs, function(err){
            if (err) {
                console.error(err);
            }
            else {
                client.commit();
            }
        });
    }
};


Indexer.prototype.search = function (term) {
    var client = this.client;

    var query = client.createQuery()
                      .q(term.toLowerCase())
                      .mm(1)
                      .qf({name: 5, description: 3, content: 1})
                      .edismax()
                      .start(0)
                      .rows(32);

    var resolver = function (resolve, reject) {
        client.search(query, function(err, obj){
            if(err){
                reject(err);
            }
            else {
                resolve(obj);
            }
        });
    };

    return (new Promise(resolver));
};


function NullIndexer () {
    this.update = _.noop;
    this.search = function () {
        return Promise.resolve({});
    };
}

var indexer;

module.exports.configure = function (config) {
    if (indexer) {
        throw (new Error('Indexer Already Configured'));
    }
    if (config) {
        var solrClient = solr.createClient(
            config.host, config.port, config.collection
        );
        solrClient.autoCommit = true;

        indexer = new Indexer(solrClient);
    }
    else {
        indexer = new NullIndexer();
    }
};


module.exports.client = function () {
    if (!indexer) {
        throw (new Error('Indexer Not Configured'));
    }
    return indexer;
};
