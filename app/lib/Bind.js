/*
 * app/lib/Bind.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */

'use strict';

var _ = require('underscore'),
    O = require('../../lib/object').Object,
    Transport = require('./Transport'),
    Model = require('./Model'),
    config = require('../../config'),
    region = require('./Region'),
    Geometry = require('./Geometry'),
    Sync = require('./Sync'),
    semaphore = require('./Semaphore'),
    Promise = require('bluebird');



var API_URL = config.public.apiUrl;

var User = Model.User,
    Group = Model.Group,
    Layer = Model.Layer,
    Feature = Model.Feature;

/**
 * A Record in Database
 * 
 * @param {object} model  A model
 * @param {Array}  comps  Paths components
 * @param {string} parent Parent Id
 */
function Record (model, comps, parent) {
    Object.defineProperty(this, 'model', {
        value: model
    });
    Object.defineProperty(this, 'comps', {
        value: Object.freeze(comps)
    });
    Object.defineProperty(this, 'parent', {
        value: parent
    });

    Object.freeze(this);
}

var DB = O.extend({
    _db : {},

    initialize: function(t) {
        this.transport = t;
    },

    makePath: function (comps) {
        var cl = comps.length;
        if (1 === cl) {
            return '/user/' + comps[0];
        }
        else if (2 === cl) {
            return '/user/' + comps[0] + '/group/' + comps[1];
        }
        else if (3 === cl) {
            return '/user/' + comps[0] + '/group/' + comps[1] + '/layer/' + comps[2];
        }
        else if (4 === cl) {
            return '/user/' + comps[0] + '/group/' + comps[1] + '/layer/' + comps[2] + '/feature/' + comps[3];
        }
        throw (new Error('wrong number of comps'));
    },

    getParent: function (comps) {
        return _.last(comps, 2)[0];
    },

    record: function (comps, model) {
        var rec;
        if (model.id in this._db) {
            var oldRec = this._db[model.id];
            oldRec.model._updateData(model.data);
            rec = new Record(oldRec.model, oldRec.comps, this.getParent(comps));
        }
        else {
            rec = new Record(model, comps, this.getParent(comps));
        }
        this._db[model.id] = rec;
        return rec;
    },

    update: function (model) {
        var self = this,
            db = this._db,
            record = db[model.id],
            path = this.makePath(record.comps);

        var resolver = function (resolve, reject) {
            self.transport
                .put(API_URL + path, {'body': model })
                    .then(function(){
                        db[model.id] = new Record(model, record.comps, record.parent);
                        resolve(model);
                    })
                    .catch(reject);
        };
        return (new Promise(resolver));
    },


    has: function (id) {
        return (id in this._db);
    },

    get: function (id) {
        return this._db[id].model;
    },

    del: function (id) {
        delete this._db[id];
    },

    getComps: function (id) {
        return _.clone(this._db[id].comps);
    },

    lookupKey: function (prefix) {
        var pat = new RegExp('^'+prefix+'.*');
        var result = [];
        _.each(this._db, function(val, key){
            if(key.match(pat)){
                result.push(this.get(key));
            }
        }, this);
        return result;
    },

    lookup: function (predicate) {
        var result = _.pluck(_.filter(this._db, predicate, this), 'model');
        return result;
    }
});


function objectifyResponse (response) {
    if('string' === typeof response) {
        try{
            return JSON.parse(response);
        }
        catch(err){
            console.error(err);
            throw (err);
        }
    }
    return response;
}

var Bind = O.extend({

    initialize: function (options) {
        this.transport = new Transport();
        this.db = new DB(this.transport);
        this.featurePages = {};

        semaphore.on('sync', function(chan, cmd, data){
            if ('update' === cmd) {
                if (this.db.has(data.id)) {
                    var model = this.db.get(data.id);
                    model._updateData(data);
                }
            }
            else if ('create' === cmd) {
                var ctx = chan.type;
                if ('layer' === ctx) {
                    if (!this.db.has(data.id)) {
                        var layerId = chan.id,
                            feature = new Feature(data),
                            comps = this.getComps(layerId);
                        comps.push(feature.id);
                        var rec = this.db.record(comps, feature);
                        // console.log('comps', comps, rec);
                        this.changeParent(layerId);
                    }
                }
            }
            else if ('delete' === cmd) {
                var ctx = chan.type;
                if ('layer' === ctx) {
                    var fid = data;
                    if (this.db.has(fid)) {
                        var layerId = chan.id;
                        this.db.del(fid);
                        this.changeParent(layerId);
                    }
                }
            }
        }, this);
    },

    update: function (model) {
        return this.db.update(model);
    },

    changeParent: function (parentId) {
        if(this.db.has(parentId)){
            var parent = this.db.get(parentId);
            // console.log('binder.changeParent', parent.id);
            parent.emit('change');
        }
    },

    getMe: function () {
        var db = this.db,
            binder = this;
        var pr = function (response) {
            var u = new User(objectifyResponse(response));
            db.record([u.id], u);
            return u;
        };

        var url = API_URL+'/auth';
        return this.transport.get(url, {parse: pr});
    },

    getComps: function (id) {
        return this.db.getComps(id);
    },

    getUser: function (userId) {
        var db = this.db,
            path = '/user/'+userId,
            binder = this;

        if(db.has(userId)){
            return Promise.resolve(db.get(userId));
        }
        var pr = function (response) {
            var u = new User(objectifyResponse(response));
            db.record([userId], u);
            return u;
        };
        var url = API_URL+path;
        return this.transport.get(url, {parse: pr});
    },

    getGroup: function (userId, groupId) {
        var db = this.db,
            binder = this,
            path = '/user/'+userId+'/group/'+groupId;
        if(db.has(groupId)){
            return Promise.resolve(db.get(groupId));
        }
        var pr = function (response) {
            var groupData = objectifyResponse(response),
                g = new Group(_.omit(groupData.group, 'layers')),
                layers = groupData.group.layers;

            db.record([userId, groupId], g);

            for (var i = 0; i < layers.length; i++) {
                var layer = layers[i],
                    l = new Layer(_.omit(layer, 'features')),
                    features = layer.features;

                db.record([userId, groupId, layer.id], l);

                for (var j = 0; j < features.length; j++) {
                    var feature = features[j],
                        f = new Feature(feature);

                    db.record([userId, groupId, layer.id, feature.id], f);
                }
                Sync.subscribe('layer', layer.id);
            }
            semaphore.signal('stop:loader');
            Sync.subscribe('group', groupId);
            return g;
        };
        var url = API_URL+path;
        semaphore.signal('start:loader', 'downloading map data');
        return this.transport.get(url, {parse: pr});
    },

    _groupCache: {},
    getGroups: function (userId) {
        var db = this.db,
            binder = this,
            path = '/user/'+userId+'/group/',
            gc = this._groupCache;

        var pr = function (response) {
            var data = objectifyResponse(response);

            var ret = [];
            for(var i = 0; i < data.results.length; i++){
                var groupData = data.results[i];
                if(db.has(groupData.id)){
                    ret.push(db.get(groupData.id));
                }
                else if (groupData.id in gc) {
                    ret.push(gc[groupData.id]);
                }
                else {
                    var g = new Group(groupData);
                    // we do not record here, it would prevent deep loading a group
                    // db.record(path+g.id, g);
                    gc[groupData.id] = g;
                    ret.push(g);
                }
            }
            return ret;
        };
        var url = API_URL + path;
        return this.transport.get(url, {parse: pr});
    },

    getLayer: function (userId, groupId, layerId) {
        var db = this.db,
            binder = this,
            path = '/user/'+userId+'/group/'+groupId+'/layer/'+layerId;
        if(db.has(layerId)){
            return Promise.resolve(db.get(layerId));
        }
        var pr = function (response) {
            var l = new Layer(objectifyResponse(response));
            db.record([userId, groupId, layerId], l);
            return l;
        };
        var url = API_URL + path;
        return this.transport.get(url, {parse: pr});
    },

    getLayers: function (userId, groupId) {
        return Promise.resolve(this.db.lookup(function(rec, key){
            return (rec.parent === groupId);
        }));

    },

    getFeature: function (userId, groupId, layerId, featureId) {
        var db = this.db,
            binder = this,
            path = '/user/'+userId+'/group/'+groupId+'/layer/'+layerId+'/feature/'+featureId;
        if(db.has(featureId)){
            return Promise.resolve(db.get(featureId));
        }
        var pr = function (response) {
            var f = new Feature(objectifyResponse(response));
            db.record([userId, groupId, layerId, featureId], f);
            return f;
        };
        var url = API_URL + path;
        return this.transport.get(url, {parse: pr});
    },

    delFeature: function (userId, groupId, layerId, featureId) {
        var feature = this.db.get(featureId),
            geom = feature.getGeometry(),
            path = '/user/' + userId +
                   '/group/' + groupId +
                   '/layer/' + layerId +
                   '/feature.'+ geom.getType() +'/' + featureId,
            url = API_URL + path,
            db = this.db,
            self = this;

        var pr = function () {
            db.del(featureId);
            self.changeParent(layerId);
        };

        return this.transport.del(url, {parse: pr});
    },

    getFeatures: function (userId, groupId, layerId, page) {
        return Promise.resolve(this.db.lookup(function(rec, key){
            return (rec.parent === layerId);
        }));
    },


    setGroup: function (userId, data) {
        var db = this.db,
            binder = this,
            path = '/user/'+userId+'/group/';

        var pr = function (response) {
            var g = new Group(objectifyResponse(response));
            db.record([userId, g.id], g);
            binder.changeParent(userId);
            return g;
        };

        var url = API_URL+path;
        return this.transport.post(url, {
            parse: pr,
            body: data
        });
    },

    setLayer: function (userId, groupId, data) {
        var db = this.db,
            binder = this,
            path = '/user/'+userId+'/group/'+groupId+'/layer/';

        var pr = function (response) {
            var g = new Layer(objectifyResponse(response));
            db.record([userId, groupId, g.id], g);
            binder.changeParent(groupId);
            return g;
        };

        var url = API_URL+path;
        return this.transport.post(url, {
            parse: pr,
            body: data
        });
    },

    setFeature: function (userId, groupId, layerId, data, batch) {
        var db = this.db,
            binder = this,
            path = '/user/'+userId+'/group/'+groupId+'/layer/'+layerId+ '/feature/';

        var pr = function (response) {
            var f = new Feature(objectifyResponse(response));
            db.record([userId, groupId, layerId, f.id], f);
            if (!batch) {
                binder.changeParent(layerId);
            }
            return f;
        };

        var url = API_URL+path;
        return this.transport.post(url, {
            parse: pr,
            body: data
        });
    },


    attachLayerToGroup: function (guid, groupId, layerId) {
        var db = this.db,
            binder = this,
            path = '/user/'+guid+'/group/'+groupId+'/attach/',
            data = {
                'layer_id': layerId,
                'group_id': groupId
            };

        var url = API_URL+path;
        return this.transport.post(url, {
            'body': data
        });
    },

    detachLayerFromGroup: function (userId, groupId, layerId) {
        var path = '/user/' + userId +
                   '/group/' + groupId +
                   '/detach/' + layerId,
            url = API_URL + path,
            db = this.db,
            self = this;

        var pr = function () {
            self.changeParent(groupId);
        };

        return this.transport.del(url, {parse: pr});
    },

    matchKeyAsync: function (prefix) {
        var res = this.db.lookupKey(prefix);
        if(res.length > 0){
            return Promise.resolve(res);
        }
        return Promise.reject('No Match');
    },

    matchKey: function (prefix) {
        return this.db.lookupKey(prefix);
    }

});

var bindInstance = null;

module.exports.get = function () {
    if(!bindInstance){
        bindInstance = new Bind();
    }
    return bindInstance;
};


module.exports.configureModels = function (configurator) {
    User = configurator(User);
    Group = configurator(Group);
    Layer = configurator(Layer);
    Feature = configurator(Feature);
};
