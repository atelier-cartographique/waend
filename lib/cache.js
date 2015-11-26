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

var _ = require('underscore'),
    util = require('util'),
    uuid = require('node-uuid'),
    Promise = require('bluebird'),
    getBBoxVanilla = require('./bbox'),
    solr = require('solr-client'),
    Database = require('./db'),
    Store = require('./store'),
    wellknown = require('wellknown'),
    redisCb = require('redis');

var redis = Promise.promisifyAll(redisCb);
Promise.longStackTraces();

var kvClient,
    persistentClient,
    cacheInstance;


function getBBox (geom) {
    var bbox = getBBoxVanilla({'type': 'Feature', 'geometry': geom});
    if(bbox.w <= 0) {
        bbox.w = 0.000001;
    }
    if(bbox.h <= 0) {
        bbox.h = 0.000001;
    }
    return _.pick(bbox, 'x', 'y', 'w', 'h');
}

function AbstractObject(){}

_.extend(AbstractObject.prototype, {
    parse: JSON.parse,
    stringify: JSON.stringify,
    prepare: function (obj) {
        if(!('id' in obj)){
            return _.extend(obj, {
                id: uuid.v4()
            });
        }
        return obj;
    },
    getParameters: function(obj) {
        var p = _.result(this, 'parameters'),
            ret = [];
        _.each(p, function(key){
            ret.push(obj[key]);
        });
        return ret;
    },
    buildFromPersistent: function (row) {
        var p = _.result(this, 'parameters'),
            ret = {};
        _.each(p, function(key){
            ret[key] = row[key];
        });
        return ret;
    }
});


function geomBuildFromPersistent (row) {
    var p = _.result(this, 'parameters'),
        ret = {};
    _.each(p, function(key){
        if('geom' === key
            && _.isString(row[key])) {
            try{
                ret[key] = JSON.parse(row[key]);
            }
            catch(err){
                ret[key] = wellknown.parse(row[key]);
            }
        }
        else{
            ret[key] = row[key];
        }
    });
    return ret;
}

function geomPrepare (obj) {
    if(!('id' in obj)){
        _.extend(obj, {
            id: uuid.v4()
        });
    }
    if('geom' in obj
        && _.isObject(obj.geom)){
        obj.geom = JSON.stringify(obj.geom);
    }
    return obj;
}

function Entity () {
    this.parameters = ['id', 'layer_id', 'user_id', 'properties', 'geom'];
}
util.inherits(Entity, AbstractObject);


function Path () {
    this.parameters = ['id', 'layer_id', 'user_id', 'properties', 'geom'];
}
util.inherits(Path, AbstractObject);

function Spread () {
    this.parameters = ['id', 'layer_id', 'user_id', 'properties', 'geom'];
}
util.inherits(Spread, AbstractObject);

Entity.prototype.buildFromPersistent = geomBuildFromPersistent;
Path.prototype.buildFromPersistent = geomBuildFromPersistent;
Spread.prototype.buildFromPersistent = geomBuildFromPersistent;

Entity.prototype.prepare = geomPrepare;
Path.prototype.prepare = geomPrepare;
Spread.prototype.prepare = geomPrepare;

function Layer () {
    this.parameters = ['id', 'user_id', 'properties'];
}
util.inherits(Layer, AbstractObject);

function User () {
    this.parameters = ['id', 'auth_id', 'properties'];
}
util.inherits(User, AbstractObject);

function Subscription () {
    this.parameters = ['id', 'user_id', 'group_id'];
}
util.inherits(Subscription, AbstractObject);

function Composition () {
    this.parameters = ['id', 'layer_id', 'group_id'];
}
util.inherits(Composition, AbstractObject);

function Group () {
    this.parameters = ['id', 'user_id', 'status_flag', 'properties'];
}
util.inherits(Group, AbstractObject);


var Types = {
    entity: new Entity(),
    path: new Path(),
    spread: new Spread(),
    layer: new Layer(),
    user: new User(),
    subscription: new Subscription(),
    composition: new Composition(),
    group: new Group()
};


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
    this.expire = 0;
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
    return kvClient.setAsync(this.id, objString)
            .then(function(){
                console.log('Item Stored');
                that.data = null;
                that.dirty = false;
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
        console.log('########## END ##########');
        return this.updateRecord();
    }

    var end = endMethod.bind(this);

    function getFeatures (lyr) {
        // console.log('getFeatures');
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
        // console.log('getLayer');
        var layerId = composition.layer_id;
        return getFromPersistent('layer', layerId);
                // .then(getFeatures)
                // .catch(logError('CacheItem.load.getLayer'));
    }

    function getCompositions (results) {
        // console.log('getCompositions', results);
        if (results && results.length > 0) {
            return Promise.map(results, getLayer)
                          .map(getFeatures)
                          .then(end);
        }
        return end();
    }

    function getGroup (group) {
        // console.log('getGroup');
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
    return kvClient.getAsync(this.id);
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
    var item;
    if (gid in this.groups) {
        item = this.groups[gid];
        if (!item.dirty) {
            return Promise.resolve(item);
        }
        else {
            return this.itemLoader(item);
        }
    }
    else {
        item = new CacheItem(gid);
        this.groups[gid] = item;
        return this.itemLoader(item);
    }
};

CacheStore.prototype.updateGroups = function (objType, data) {
    if ('group' === objType) {
        if (data.id in this.goups) {
            this.groups[data.id].dirty = true;
        }
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
        else if ('composition' === objType) {
            layerId = data.layer_id;
        }

        _.each(this.groups, function(item){
            if(_.indexOf(item.deps, layerId) >= 0) {
                item.dirty = true;
            }
        }, this);
    }

};


CacheError.prototype = Object.create(Error.prototype);

function Cache () {
    this.cs = new CacheStore();

    // this.searchClient = solr.createClient(
    //     config.solr.host, config.solr.port, config.solr.core
    // );
}


_.extend(Cache.prototype, {

    get: function(type, id) {
        return getFromPersistent(type, id);
    },

    set: function(objType, obj) {
        var self = this;

        var resolver = function (resolve, reject) {
            saveToPersistent(objType, obj)
                .then(function(res){
                    if(res.length > 0){
                        var newObj = Types[objType].buildFromPersistent(res[0]);
                        resolve(newObj);
                        self.cs.updateGroups(objType, newObj);
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
                    self.cs.updateGroups(featureType, {
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
            self.db.query('compositionDelete', [groupId, layerId])
                .then(function(){
                    self.cs.updateGroups('composition', {
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
                    console.log('Got ITEM');
                    resolve(item.toJSON());
                })
                .catch(reject);
        };
        return (new Promise(resolver));
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
    cacheInstance = new Cache();
};


module.exports.client = function(){
    if(!cacheInstance){
        throw (new Error('Cache not configured'));
    }
    return cacheInstance;
};
