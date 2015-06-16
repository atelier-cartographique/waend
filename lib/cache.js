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
    // FullText = require('node-ft'),
    SearchIndex = require('search-index'),
    Database = require('./db');
    // geos = require('geos'),
    // geoJSONReader = new geos.GeoJSONReader(),
    // geoJSONWriter = new geos.GeoJSONWriter(),
    // wktReader = new geos.WKTReader(),
    // wktWriter = new geos.WKTWriter();

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


function CacheError () {
    if(arguments.length > 0){
        console.error.apply(console, arguments);
    }
}

CacheError.prototype = Object.create(Error.prototype);


function Cache (config) {
    this.client = redis.createClient(config.redis.port, config.redis.host);
    this.db = Database.client();
    this.groupIndex = {};
    this.layerIndex = {};
    this.layerIndexFlat = {};
    this.subIndex = {};
    this.mapSearchIndex = SearchIndex({
        'logLevel': 'error',
        'indexPath': 'si' + Math.floor(Math.random() * 100000000)
        });
    this.userIndex = {};
    this.authIndex = {};
    this.initCache();
}


_.extend(Cache.prototype, {

    _initCacheCallback: function (type, results, success, failure) {
        var self = this,
            typeHandler = Types[type];

        var successCbDefault = function(resObj){
            console.log('Cache._initCacheCallback', type, resObj.id);
        };

        var errorCbDefault = function(err){
            throw (new Error(err));
        };

        var successCb = success || successCbDefault,
            errorCb = errorCbDefault || failure;

        for (var i = results.length - 1; i >= 0; i--) {
            var obj = typeHandler.buildFromPersistent(results[i]);
            self._insert(type, obj, successCb , errorCb);
        }

    },

    initCache: function () {


        var errorCb = function (err) {
            console.error('[ERROR] Cache.initCache', err);
        };
        var types = ['user', 'composition', 'group'];

        for(var idx in types/*Types*/){
            var t = types[idx];
            var queryName = t + 'Load';
            var callback = _.bind(_.partial(this._initCacheCallback, t), this);
            this.db.query(queryName, [])
                .then(callback)
                .catch(errorCb);
        }
    },

    saveToPersistent : function (objType, obj) {
        var op = ('id' in obj) ? 'Update' : 'Create',
            queryName = objType + op,
            prepObj = Types[objType].prepare(obj),
            params = Types[objType].getParameters(prepObj);

        return this.db.query(queryName, params);
    },

    getFromPersistent : function (objType, id) {
        var self = this,
            queryName = objType + 'Get',
            params = [id];

        var resolver = function (resolve, reject) {
            self.db.query(queryName, params)
                .then(function(results){
                    self._initCacheCallback(objType, results, resolve, reject);
                })
                .catch(reject);
        };

        return (new Promise(resolver));
    },


    indexFeature: function (feat) {
        // console.log('cache.indexFeature', feat);
        var self = this,
            layerId = feat.layer_id,
            bbox = getBBox(feat.geom);

        // console.log('cache.indexFeature', feat.id, layerId);


        if(!(layerId in self.layerIndexFlat)){
            self.layerIndexFlat[layerId] = {};
        }
        self.layerIndexFlat[layerId][feat.id] = true;


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
        var text = '',
            user_groups = this.userIndex[group.user_id] || [];
        _.each(group.properties, function(obj){
            if(typeof obj === 'string'){
                text += ' '+obj;
            }
        });
        // this.mapSearchIndex.index(group.id, text);
        this.mapSearchIndex.add({'batchName': 'a', 'filters': []},
                            [{'id': group.id, 'doc': text}], _.noop);
        //
        // if(!(group.user_id in this.userIndex)){
        //     this.userIndex[group.user_id] = [];
        // }
        user_groups.push(group.id);
        this.userIndex[group.user_id] = _.uniq(user_groups);
    },

    indexAuth: function (user) {
        this.authIndex[user.auth_id] = user.id;
    },

    get: function(type, id) {
        console.log('cache.get', type, id);
        var self = this,
            client = this.client;

        var resolver = _.partial(function (type, id, resolve, reject) {
            var successPersistent = function (res) {
                console.log('persistent.got', res);
                if (_.isString(res)) {
                    resolve(Types[type].parse(res));
                }
                else {
                    resolve(res);
                }
            };

            var fromPersistent = function () {
                console.log('Not in cache', type, id);
                self.getFromPersistent(type, id)
                    .then(successPersistent)
                    .catch(reject);
            };

            var successCache = function (res) {
                console.log('cache.got', res);
                if (!res) {
                    fromPersistent();
                }
                else {
                    if (_.isString(res)) {
                        resolve(Types[type].parse(res));
                    }
                    else {
                        resolve(res);
                    }
                }
            };


            client.getAsync(id)
                .then(successCache)
                .catch(reject);
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
                successCallback(obj);
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
                .catch(reject);
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

    delFeature: function (lid, id) {
        var self = this,
            client = this.client;

        var removeFromIndex = function (lid, id, resolve, reject) {
            client.delAsync(id)
                .then(function(n){
                    delete self.layerIndexFlat[lid][id];
                    resolve(n);
                })
                .catch(reject);
        };

        var removeFromStorage = function (feature, lid, id, resolve, reject) {
            var geomType = feature.geom.type,
                queryName;

            if ('Point' === geomType) {
                queryName = 'entityDelete';
            }
            else if ('LineString' === geomType) {
                queryName = 'pathDelete';
            }
            else if ('Polygon' === geomType) {
                queryName = 'spreadDelete';
            }

            self.db.query(queryName, [id])
                .then(function(){
                    removeFromIndex(lid, id, resolve, reject);
                })
                .catch(reject);
        };

        var resolver = _.partial(function (lid, id, resolve, reject) {
            self.getFeature(id)
                .then(function(feature){
                    removeFromStorage(feature, lid, id, resolve, reject);
                })
                .catch(reject);
        }, lid, id);

        return new Promise(resolver);
    },

    delComposition: function (groupId, layerId) {
        var self = this,
            client = this.client;

        var removeFromIndex = function (gid, lid) {
            var layers = self.groupIndex[gid];
            self.groupIndex[gid] = _.without(layers, lid);
        };

        var removeFromStorage = function (gid, lid, resolve, reject) {
            self.db.query('compositionDelete', [lid, gid])
                .then(function(){
                    removeFromIndex(gid, lid);
                    resolve();
                })
                .catch(reject);
        };

        var resolver = _.partial(removeFromStorage, groupId, layerId);

        return new Promise(resolver);
    },

    getFeatures: function (layerId) {
        console.log('getFeatures', layerId, layerId in this.layerIndexFlat);
        var self = this;

        var mapper = function (featureId) {
            return self.getFeature(featureId);
        };

        if(!(layerId in this.layerIndexFlat)){
            var resolver = function (resolve, reject) {
                var totalFeatures = 0,
                    features = [];

                var pushFeature = function (f) {
                    features.push(f);
                    if (features.length >= totalFeatures) {
                        resolve(features);
                    }
                };

                var unTotal = function () {
                    totalFeatures -= 1;
                    if (totalFeatures < 1) {
                        resolve([]);
                    }
                };

                self.db.query('pathGetLayer', [layerId])
                    .then(function(paths){
                        totalFeatures += paths.length;
                        console.log('paths', paths.length);
                        self.db.query('spreadGetLayer', [layerId])
                            .then(function(spreads){
                                totalFeatures += spreads.length;
                                if (totalFeatures < 1) {
                                    return resolve([]);
                                }
                                console.log('spreads', spreads.length);
                                self._initCacheCallback('path', paths, pushFeature, unTotal);
                                self._initCacheCallback('spread', spreads, pushFeature, unTotal);
                            });
                    })
                    .catch(reject);
            };
            return (new Promise(resolver));
        }

        var indexed = Object.keys(self.layerIndexFlat[layerId]);
        return Promise.map(indexed, mapper);
    },

    getLayers: function (groupId) {
        console.log('getLayers', groupId, groupId in this.groupIndex);
        if(!(groupId in this.groupIndex)){
            return Promise.resolve([]);
        }

        var self = this;
        var mapper = function (layerId) {
            return self.get('layer', layerId);
        };
        return Promise.map(self.groupIndex[groupId], mapper);
    },

    getMaps: function (userId, filter) {
        if(!(userId in this.userIndex)){
            return Promise.resolve([]);
        }
        var self = this;
        var mapper = function (groupId) {
            return self.get('group', groupId);
        };
        return Promise.map(self.userIndex[userId], mapper);

        // return (new Promise(resolver));
    },

    getGroup: function (gid) {
        var self = this,
            result = {};

        var processGroup = function (group) {
            result.group = group;
            return self.getLayers(gid);
        };

        var processLayers = function (layers) {
            console.log('processLayers', layers.length);
            result.group.layers = [];
            return Promise.reduce(layers, function(total, item, index) {
                var lyr = layers[index];
                result.group.layers.push(lyr);
                return self.getFeatures(lyr.id, false)
                    .then(function(features){
                        lyr.features = features;
                        total += features.length;
                    });
            }, 0);
        };

        var success = function () {
            console.log('getFeatures result', result);
            return result;
        };

        return self.get('group', gid)
            .then(processGroup)
            .then(processLayers)
            .then(success);
    },

    lookupGroups: function (expr) {
        var self = this;

        var resolver = function (resolve, reject) {
            self.mapSearchIndex.match(expr, function(err, matches) {
                if (err) {
                    return reject(err);
                }
                if (matches.length === 0) {
                    return resolve([]);
                }
                console.log('lookupGroups', matches);

                Promise.map(matches, function(item){
                    var query = {"query": { "*": [item]}};
                    var sResolver = function (sresolve, sreject) {

                        self.mapSearchIndex.search(query, function(err, results) {
                            console.log('lookupGroups', query, err, results);
                            if (err) {
                                return reject(err);
                            }
                            var mapper = function (result) {
                                return self.get('group', result.id);
                            };
                            Promise.map(results.hits, mapper)
                                .then(sresolve)
                                .catch(sreject);
                        });
                    };
                    return (new Promise(sResolver));
                })
                .then(function(results){
                    var dres = [];
                    Promise.map(results, function(res){
                        for (var i = 0; i < res.length; i++) {
                            dres.push(res[i]);
                        }
                    })
                    .then(function(){
                        resolve(dres);
                    });
                })
                .catch(reject);
            });
        };

        return (new Promise(resolver));
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
