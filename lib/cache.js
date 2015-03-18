/**
 lib/cache.js

 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 * 
 * License in LICENSE file at the root of the repository.
 
 Cache is a projection of the persistent storage.
 The API is only working with cache, which takes care
 of reflecting on the DB.


 A special attention is given to entities. They're indexed
 per layer by means of an RTree, as to allow for requests based
 on a bounding box.

 Everything is identified with an UUID.

*/

var _ = require('underscore'),
    util = require("util"),
    uuid = require('node-uuid'),
    RTree = require('rtree'),
    Promise = require("bluebird"),
    redis = Promise.promisifyAll(require('redis')),
    wellkown = require('wellknown'),
    getBBoxVanilla = require('./bbox'),
    FullText = require('node-ft'),
    Database = require('./db');
    // geos = require('geos'),
    // geoJSONReader = new geos.GeoJSONReader(),
    // geoJSONWriter = new geos.GeoJSONWriter(),
    // wktReader = new geos.WKTReader(),
    // wktWriter = new geos.WKTWriter();

'use strict';
Promise.longStackTraces();

function getBBox (geom) {
    var bbox = getBBoxVanilla({'type': 'Feature', 'geometry': geom});
    if(bbox.w <= 0) {
        bbox.w = 0.000001;
    }
    if(bbox.h <= 0) {
        bbox.h = 0.000001;
    }
    return _.pick(bbox, 'x', 'y', 'w', 'h');
};

function AbstractObject(){};
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
        // console.log('buildFromPersistent', row);
        var p = _.result(this, 'parameters'),
            ret = {};
        _.each(p, function(key){
            ret[key] = row[key];
        });
        return ret;
    },
});


function geomBuildFromPersistent (row) {
    var p = _.result(this, 'parameters'),
        ret = {};
    _.each(p, function(key){
        // console.log('geomBuildFromPersistent', key, row[key]);
        if('geom' === key 
            && _.isString(row[key]))
        {
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
};

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
};

function Entity () {
    this.parameters = ['id', 'layer_id', 'user_id', 'properties', 'geom'];
};
util.inherits(Entity, AbstractObject);


function Path () {
    this.parameters = ['id', 'layer_id', 'user_id', 'properties', 'geom'];
};
util.inherits(Path, AbstractObject);

function Spread () {
    this.parameters = ['id', 'layer_id', 'user_id', 'properties', 'geom'];
};
util.inherits(Spread, AbstractObject);

Entity.prototype.buildFromPersistent = geomBuildFromPersistent;
Path.prototype.buildFromPersistent = geomBuildFromPersistent;
Spread.prototype.buildFromPersistent = geomBuildFromPersistent;

Entity.prototype.prepare = geomPrepare;
Path.prototype.prepare = geomPrepare;
Spread.prototype.prepare = geomPrepare;

function Layer () {
    this.parameters = ['id', 'user_id', 'properties'];
};
util.inherits(Layer, AbstractObject);

function User () {
    this.parameters = ['id', 'auth_id', 'properties'];
};
util.inherits(User, AbstractObject);

function Subscription () {
    this.parameters = ['id', 'user_id', 'group_id'];
};
util.inherits(Subscription, AbstractObject);

function Composition () {
    this.parameters = ['id', 'layer_id', 'group_id'];
};
util.inherits(Composition, AbstractObject);

function Group () {
    this.parameters = ['id', 'user_id', 'status_flag', 'properties'];
};
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


function CacheError () {
    if(arguments.length > 0){
        console.error.apply(console, arguments);
    }
};

CacheError.prototype = Object.create(Error.prototype);


function Cache (config) {
    this.client = redis.createClient(config.redis.port, config.redis.host);
    this.db = Database.client();
    this.groupIndex = {};
    this.layerIndex = {};
    this.subIndex = {};
    this.mapSearchIndex = FullText();
    this.userIndex = {};
    this.authIndex = {};
    this.initCache();
};


_.extend(Cache.prototype, {

    _initCacheCallback: function (type, results) {
        var self = this,
            typeHandler = Types[type];
        console.log('Cache.initCache', type, results.length);
        for (var i = results.length - 1; i >= 0; i--) {
            var obj = typeHandler.buildFromPersistent(results[i]);
            // console.log('obj', obj);
            self._insert(type, obj, 
                function(resObj){
                    console.log('Cache._initCacheCallback', type, resObj.id);
            }, function(err){
                    throw (new Error(err));
                    console.error('[ERROR] Cache._initCacheCallback', type, err);
            });
        };
        
    },

    initCache: function () {
        var self = this;

        for(var t in Types){
            self.db.query(t+'Load', [])
                .then(_.bind(_.partial(self._initCacheCallback, t), self))
                .catch(function(err){
                    console.error('[ERROR] Cache.initCache', err);
                });
        }
    },

    saveToPersistent : function (objType, obj) {
        var op = ('id' in obj) ? 'Update' : 'Create',
            queryName = objType + op,
            prepObj = Types[objType].prepare(obj),
            params = Types[objType].getParameters(prepObj);

        return this.db.query(queryName, params);
    },

    indexFeature: function (feat) {
        // console.log('cache.indexFeature', feat);
        var self = this,
            layerId = feat.layer_id,
            bbox = getBBox(feat.geom);

        console.log('cache.indexFeature', feat.id, bbox);

        if(!(layerId in self.layerIndex)){
            self.layerIndex[layerId] = new RTree();
        }
        var index = self.layerIndex[layerId];
        self.client.getAsync(feat.id)
            .then(function(res){
                if(res){
                    try{
                        var old = JSON.parse(res),
                            oldbbox = getBBox(old.geom);
                        if(old.id){
                            index.remove(oldbbox, old.id);
                        }
                    }
                    catch(err){}
                    var inserted = index.insert(bbox, feat.id);
                    // console.log('update feature index', inserted);
                }
                else{
                    var inserted = index.insert(bbox, feat.id);
                    // console.log('created feature index', inserted);
                }
            })
            .catch(function(err){
                console.error('cache.indexFeature', err);
            })

    },

    indexLayer: function(composition) {
        var layerId = composition.layer_id,
            groupId = composition.group_id;

        if(!(groupId in this.groupIndex)){
            this.groupIndex[groupId] = [];
        }

        this.groupIndex[groupId].push(layerId);
    },

    indexMap: function(group) {
        var text = '';
        _.each(group.properties, function(obj){
            if(typeof obj === 'string'){
                text += ' '+obj;
            }
        });
        this.mapSearchIndex.index(group.id, text);

        if(!(group.user_id in this.userIndex)){
            this.userIndex[group.user_id] = [];
        }
        this.userIndex[group.user_id].push(group.id)
    },

    indexAuth: function (user) {
        this.authIndex[user.auth_id] = user.id;
    },

    get: function(type, id) {
        var client = this.client;
        
        var resolver = _.partial(function (type, id, resolve, reject) {
            client.getAsync(id)
                .then(function(res){
                    resolve(Types[type].parse(res));
                })
                .catch(reject)
        }, type, id);

        return new Promise(resolver);
    },

    _insert: function (objType, obj, successCallback, errorCallback) {
        var self = this;
        this.client.setAsync(obj.id, Types[objType].stringify(obj))
            .then(function(){
                if('entity' === objType 
                    || 'path' === objType 
                    || 'spread' === objType){
                    self.indexFeature(obj);
                }
                else if('composition' === objType){
                    self.indexLayer(obj);
                }
                else if('group' === objType){
                    self.indexMap(obj);
                }
                else if('user' === objType){
                    self.indexAuth(obj);
                }
                successCallback(obj)
            })
            .catch(errorCallback);
    },

    set: function(objType, obj) {
        var self = this;
        var resolver = function (resolve, reject) {
            self.saveToPersistent(objType, obj)
                .then(function(res){
                    if(res.length > 0){
                        console.log('cache.set saved to persistent', objType, res[0]);
                        var newObj = Types[objType].buildFromPersistent(res[0]);
                        self._insert(objType, newObj, resolve, reject);
                    }
                })
                .catch(reject);
        };

        return new Promise(resolver);
    },

    getFeature: function (id) {
        var client = this.client;
        
        var resolver = _.partial(function (id, resolve, reject) {
            client.getAsync(id)
                .then(function(res){
                    var obj = JSON.parse(res);
                    resolve(obj);
                })
                .catch(reject)
        }, id);

        return new Promise(resolver);
    },

    setFeature: function (obj) {
        var geomType = (obj.geom) ? obj.geom.type: 'x';

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

    getFeatures: function (layerId, bounds) { // bounds is well formed: {n,w,s,e}
        if(!(layerId in this.layerIndex)){
            return Promise.reject(new CacheError('layerId ['+layerId+'] not indexed'));
        }
        var self = this;
        var resolver = function(resolve, reject){
            var results = [],
                gets = 0,
                bbox = [[bounds.w, bounds.s],[bounds.e, bounds.n]]; // https://github.com/leaflet-extras/RTree#rtreebbox

            var startTs = Date.now();
            // console.log('layer index', self.layerIndex[layerId].toJSON());
            console.log('search feature in', layerId, 'within', bbox);
            var indexed = self.layerIndex[layerId].bbox(bbox);
            console.log('found', indexed.length, 'feature(s) in', (Date.now() - startTs), 'ms');
            if(indexed.length > 0){
                for(var i = 0; i < indexed.length; i++){
                    var featureId = indexed[i];
                    self.getFeature(featureId)
                        .then(function(feature){
                            results.push(feature);
                            gets += 1;
                            if(gets === indexed.length){
                                resolve(results);
                            }
                        })
                        .catch(function(err){
                            gets += 1;
                            if(gets === indexed.length){
                                resolve(results);
                            }
                        });
                }
            }
            else{
                resolve([]);
            }
        };
        return (new Promise(resolver));
    },

    getLayers: function (groupId) {
        if(!(groupId in this.groupIndex)){
            return Promise.reject(new CacheError('groupId ['+groupId+'] not indexed'));
        }

        var self = this;
        var resolver = function(resolve, reject){
            var results = [],
                indexed = self.groupIndex[groupId],
                gets = 0;
            for(var i = 0; i < indexed.length; i++){
                var layerId = indexed[i];
                self.get('layer', layerId)
                    .then(function(layer){
                        results.push(layer);
                        gets += 1;
                        if(gets === indexed.length){
                            resolve(results);
                        }
                    })
                    .catch(function(err){
                        gets += 1;
                        if(gets === indexed.length){
                            resolve(results);
                        }
                    });
            }
        };
        return (new Promise(resolver));
    },

    getMaps: function (userId, filter) {
        if(!(userId in this.userIndex)){
            return Promise.reject(new CacheError('userId ['+userId+'] not indexed'));
        }
        var self = this;
        var resolver = function(resolve, reject){
            var results = [],
                indexed = self.userIndex[userId],
                gets = 0;
            for(var i = 0; i < indexed.length; i++){
                var groupId = indexed[i];
                self.get('group', groupId)
                    .then(function(group){
                        results.push(group);
                        gets += 1;
                        if(gets === indexed.length){
                            resolve(results);
                        }
                    })
                    .catch(function(err){
                        gets += 1;
                        if(gets === indexed.length){
                            resolve(results);
                        }
                    });
            }
        };
        return (new Promise(resolver));
    },

    lookupGroups: function (expr) {
        var maps = this.mapSearchIndex.search(expr);
        return Promise.resolve(maps);
    },

    getAuthenticatedUser: function (auth_id) {
        if(!(auth_id in this.authIndex)){
            return Promise.reject(new CacheError('auth_id ['+auth_id+'] not indexed'));
        }
        return this.get('user', this.authIndex[auth_id]);
    }
});


var cacheInstance;
module.exports.configure = function(config){
    if(cacheInstance){
        return;
    }
    cacheInstance = new Cache(config);
};


module.exports.client = function(){
    if(!cacheInstance){
        throw (new Error('Cache not configured'));
    }
    return cacheInstance;
}; 
