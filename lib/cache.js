/**
 lib/cache.js

 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.

 Cache is a projection of the persistent storage.
 The API is only working with cache, which takes care
 of reflecting on the DB.

 Everything is identified with an UUID.

*/

var logger = require('debug')('lib/cache'),
    _ = require('underscore'),
    Promise = require('bluebird'),
    Database = require('./db'),
    Store = require('./store'),
    Indexer = require('./indexer'),
    Types = require('./models');

var kvClient,
    persistentClient,
    indexerClient,
    cacheInstance;


function getFromPersistent (objType, id) {
    var queryName = objType + 'Get',
        typeHandler = Types[objType],
        params = [id];

    var resolver = function (resolve, reject) {
        persistentClient.query(queryName, params)
            .then(function(results){
                if (results && results.length > 0) {
                    var obj = typeHandler.buildFromPersistent(results[0]);
                    resolve(obj);
                }
                else {
                    reject(new Error('NotFound'));
                }
            })
            .catch(reject);
    };

    return (new Promise(resolver));
}

function queryPersistent (queryName, objType, params) {
    var typeHandler = Types[objType];

    params = params || [];

    var resolver = function (resolve, reject) {
        persistentClient.query(queryName, params)
            .then(function(results){
                if (results) {
                    var objs = [];
                    for (var i = 0; i < results.length; i++) {
                        var obj = typeHandler.buildFromPersistent(results[i]);
                        objs.push(obj);
                    }
                    resolve(objs);
                }
                else {
                    reject(new Error('EmptyResultSet'));
                }
            })
            .catch(reject);
    };

    return (new Promise(resolver));
}



function saveToPersistent (objType, obj) {
    var op = ('id' in obj) ? 'Update' : 'Create',
        queryName = objType + op,
        prepObj = Types[objType].prepare(obj),
        params = Types[objType].getParameters(prepObj);

    return persistentClient.query(queryName, params);
}


function logError(name) {
    return function (err) {
        console.error(name, err);
    };
}



/**
 * A CacheItem is responsible for maintaining a connection between
 * a map data and a JSON string representing this data ready to be served.
 * @method CacheItem
 * @param  {string}  mapId A map uuid
 */
function CacheItem (mapId) {
    this.id = mapId;
    this.created = Date.now();
    this.reloadTimeoutID = null;
    this.isActive = false;
    this.data = null;
    this.deps = [];
    this.dirty = true;
}


/**
 * updates a record on the KV store
 * @method updateRecord
 * @param  {object}     group A full data object for a group
 * @return {Promise}           query to KV store
 */
CacheItem.prototype.updateRecord = function () {
    var objString = JSON.stringify(this.data),
        layers = this.data.group.layers,
        that = this;
    this.deps = [];
    for (var i = 0; i < layers.length; i++) {
        this.deps.push(layers[i].id);
    }
    return kvClient.put(this.id, objString)
            .then(function(){
                // logger('Item Stored');
                that.data = null;
                that.markClean();
            })
            .catch(logError('CacheItem.updateRecord'));
};

/**
 * load data from persistent storage and insert it in a kv store
 * @method load
 * @return {CacheItem} itself
 */
CacheItem.prototype.loadFromPersistent = function () {
    this.data = {};
    this.dirty = true;
    var groupId = this.id,
        groupData = this.data;

    function endMethod () {
        return this.updateRecord();
    }

    var end = endMethod.bind(this);

    function getFeatures (lyr) {
        // logger('getFeatures');
        var layerId = lyr.id,
            queries = [], models = [],
            features = [];

        _.each(['entity', 'path', 'spread'], function(t){
            queries.push(persistentClient.query(t + 'GetLayer', [layerId]));
            models.push(Types[t]);
        });

        var mapper = function(results, index){
            if (results) {
                var model = models[index];
                for (var i = 0; i < results.length; i++) {
                    features.push(model.buildFromPersistent(results[i]));
                }
            }
        };

        return Promise.map(queries, mapper)
                    .then(function(){
                        lyr.features = features;
                        groupData.group.layers.push(lyr);
                    });

    }

    function getLayer (composition) {
        // logger('getLayer');
        var layerId = composition.layer_id;
        return getFromPersistent('layer', layerId);
    }

    function getCompositions (results) {
        // logger('getCompositions', results);
        if (results && results.length > 0) {
            return Promise.map(results, getLayer)
                          .map(getFeatures)
                          .then(end);
        }
        return end();
    }

    function getGroup (group) {
        // logger('getGroup');
        groupData.group = group;
        groupData.group.layers = [];
        return persistentClient.query('compositionGetForGroup', [groupId])
                .then(getCompositions)
                .catch(logError('CacheItem.load.getGroup'));
    }

    return getFromPersistent('group', groupId)
            .then(getGroup)
            .catch(logError('CacheItem.load'));
};

/**
 * get the data out of the KV store
 * @method toJSON
 * @return {string} A JSON string
 */
CacheItem.prototype.toJSON = function () {
    return kvClient.get(this.id);
};


CacheItem.prototype.markDirty = function () {
    this.dirty = true;
    if (this.reloadTimeoutID !== null) {
        clearTimeout(this.reloadTimeoutID);
    }
    var reload = this.loadFromPersistent.bind(this);
    this.reloadTimeoutID = setTimeout(reload, 1000 * 60);
};

CacheItem.prototype.markClean = function () {
    this.dirty = false;
    if (this.reloadTimeoutID !== null) {
        clearTimeout(this.reloadTimeoutID);
    }
    this.reloadTimeoutID = null;
};

function CacheError () {
    if(arguments.length > 0){
        console.error.apply(console, arguments);
    }
}


function CacheStore () {
    this.groups = {};
}


CacheStore.prototype.itemLoader = function (item) {
    return (new Promise(function (resolve, reject) {
        var success = function () {
            resolve(item);
        };
        item.loadFromPersistent()
            .then(success)
            .catch(reject);
    }));
};

CacheStore.prototype.get = function (gid) {
    logger('CacheStore.get', gid);
    var item;
    if (gid in this.groups) {
        logger('Is In Store');
        item = this.groups[gid];
        if (!item.dirty) {
            logger('Is Clean');
            return Promise.resolve(item);
        }
        else {
            logger('Is Dirty');
            return this.itemLoader(item);
        }
    }
    else {
        item = new CacheItem(gid);
        this.groups[gid] = item;
        logger('Is Not In Store, insert', gid);
        return this.itemLoader(item);
    }
};

CacheStore.prototype.actionCreate = function (objType, data, groups) {
    if ('composition' === objType) {
        if (data.group_id in this.groups) {
            var lid = data.layer_id,
                citem = this.groups[data.group_id];
            citem.deps.push(lid);
            citem.markDirty();
            logger('Mark Dirty', data.group_id);
        }
    }
    else if ('entity' === objType
                 || 'path' === objType
                 || 'spread' === objType) {

        var layerId = data.layer_id;

        _.each(this.groups, function(item, gid){
            if(_.indexOf(item.deps, layerId) >= 0) {
                item.markDirty();
                groups.push(gid);
                logger('Mark Dirty', gid);
            }
        }, this);
    }
};

CacheStore.prototype.actionUpdate = function (objType, data, groups) {
    if ('group' === objType) {
        if (data.id in this.groups) {
            this.groups[data.id].markDirty();
        }
        groups.push(data.id);
    }
    else {
        var layerId;
        if ('layer' === objType) {
            layerId = data.id;
        }
        else if ('entity' === objType
                 || 'path' === objType
                 || 'spread' === objType) {
            layerId = data.layer_id;
        }

        _.each(this.groups, function(item, gid){
            if(_.indexOf(item.deps, layerId) >= 0) {
                item.markDirty();
                groups.push(gid);
                logger('Mark Dirty', gid);
            }
        }, this);
    }
};


CacheStore.prototype.actionDelete = function (objType, data, groups) {
    if ('composition' === objType) {
        if (data.group_id in this.groups) {
            var lid = data.layer_id,
                citem = this.groups[data.group_id];
            citem.deps = _.without(citem.deps, lid);
            citem.markDirty();
            logger('Mark Dirty', data.group_id);
        }
    }
    else if ('entity' === objType
                 || 'path' === objType
                 || 'spread' === objType) {

        var layerId = data.layer_id;

        _.each(this.groups, function(item, gid){
            if(_.indexOf(item.deps, layerId) >= 0) {
                item.markDirty();
                groups.push(gid);
                logger('Mark Dirty', gid);
            }
        }, this);
    }
};


CacheStore.prototype.updateGroups = function (objType, action, data) {
    logger('CacheStore.updateGroups', objType);
    var groups = [];
    switch (action) {
        case 'create':
            this.actionCreate(objType, data, groups);
            break;
        case 'update':
            this.actionUpdate(objType, data, groups);
            break;
        case 'delete':
            this.actionDelete(objType, data, groups);
            break;
    }
    if (groups.length > 0) {
        indexerClient.update(objType, groups, data);
    }
};


CacheError.prototype = Object.create(Error.prototype);

function Cache () {
    this.cs = new CacheStore();
}


_.extend(Cache.prototype, {

    get: function(type, id) {
        return getFromPersistent(type, id);
    },

    set: function(objType, obj) {
        var self = this,
            action = ('id' in obj) ? 'update' : 'create';

        var resolver = function (resolve, reject) {
            saveToPersistent(objType, obj)
                .then(function(res){
                    if(res.length > 0){
                        var newObj = Types[objType].buildFromPersistent(res[0]);
                        resolve(newObj);
                        self.cs.updateGroups(objType, action, newObj);
                    }
                })
                .catch(reject);
        };

        return new Promise(resolver);
    },

    setFeature: function (obj) {
        var geomType = (obj.geom) ? obj.geom.type : 'x';

        if ('Point' === geomType) {
            return this.set('entity', obj);
        }
        else if ('LineString' === geomType) {
            return this.set('path', obj);
        }
        else if ('Polygon' === geomType) {
            return this.set('spread', obj);
        }

        return Promise.reject('unsupported geometry type');
    },

    delFeature: function (lid, fid, geomType) {
        var self = this;

        var resolver = function (resolve, reject) {
            var featureType,
                queryName;

            if ('point' === geomType) {
                featureType = 'entity';
            }
            else if ('linestring' === geomType) {
                featureType = 'path';
            }
            else if ('polygon' === geomType) {
                featureType = 'spread';
            }
            queryName = featureType + 'Delete';

            persistentClient.query(queryName, [fid])
                .then(function(){
                    resolve();
                    self.cs.updateGroups(featureType, 'delete', {
                        'id': fid,
                        'layer_id': lid
                    });
                })
                .catch(reject);
        };

        return new Promise(resolver);
    },

    delComposition: function (groupId, layerId) {
        var self = this;

        var resolver = function (resolve, reject) {
            persistentClient.query('compositionDelete', [groupId, layerId])
                .then(function(){
                    self.cs.updateGroups('composition', 'delete', {
                        'group_id': groupId
                    });
                    resolve();
                })
                .catch(reject);
        };

        return new Promise(resolver);
    },



    getGroup: function (gid) {
        var ccst = this.cs;
        var resolver = function(resolve, reject) {
            ccst.get(gid)
                .then(function(item){
                    resolve(item.toJSON());
                })
                .catch(reject);
        };
        return (new Promise(resolver));
    },

    lookupGroups: function (term) {
        var self = this;
        var transform = function (result) {
            // logger(result);
            var response = result.response,
                docs = response.docs,
                objs = [];
            for (var i = 0; i < docs.length; i++) {
                var doc = docs[i],
                    groups = doc.groups || [];
                // logger('::', doc);
                for (var j = 0; j < groups.length; j++) {
                    objs.push(self.get('group', groups[j]));
                }
            }

            return Promise.all(objs);
        };
        return indexerClient.search('*' + term + '*').then(transform);
    },

    query: function (qname, type, args) {
        return queryPersistent(qname, type, args);
    }


});


module.exports.configure = function(){
    if(cacheInstance){
        return;
    }
    kvClient = Store.client();
    persistentClient = Database.client();
    indexerClient = Indexer.client();
    cacheInstance = new Cache();
};


module.exports.client = function(){
    if(!cacheInstance){
        throw (new Error('Cache not configured'));
    }
    return cacheInstance;
};
