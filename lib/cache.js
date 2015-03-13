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
    // wellkown = require('wellknown'),
    getBBox = require('./bbox'),
    FullText = require('node-ft'),
    Database = require('./db'),
    geos = require('geos'),
    geoJSONReader = new geos.GeoJSONReader(),
    geoJSONWriter = new geos.GeoJSONWriter(),
    wktReader = new geos.WKTReader(),
    wktWriter = new geos.WKTWriter();

'use strict';
Promise.longStackTraces();

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
            if('geom' === key){
                var geom = geoJSONReader.read(obj[key]);
                var wkt = wktWriter.write(geom);
                ret.push(wkt);
            }
            else{
                ret.push(obj[key]);
            }
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
        var layerId = feat.layer_id,
            bbox = getBBox(feat.geometry);

        if(!(layerId in this.layerIndex)){
            this.layerIndex[layerId] = new RTree();
        }

        this.layerIndex[layerId].insert(bbox, feat.id);
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
                    console.log('cache.set saved to persistent', objType, obj);
                    self._insert(objType, obj, resolve, reject);
                })
                .catch(reject);
        };

        return new Promise(resolver);
    },

    getEntities: function (layerId, bounds) { // at first we'll assume that bounds is well formed: {x,y,w,h}
        if(!(layerId in this.layerIndex)){
            return Promise.reject(new CacheError('layerId ['+layerId+'] not indexed'));
        }
        return Promise.resolve(this.layerIndex[layerId].search(bounds));
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
