/*
 * app/lib/Bind.js
 *     
 * 
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 * 
 * License in LICENSE file at the root of the repository.
 *


This module takes care of keeping track of views 
attached to model instances.

{
    TYPE: {
        ID: {
            VIEWS: [...]
            MODEL: modelInstance
        }
    }
}


It listens to model changes and calls back all the views connected to it to re-render.


 */



var _ = require('underscore'),
    O = require('../../lib/object').Object,
    Transport = require('./Transport'),
    Model = require('./Model'),
    config = require('../../config'),
    region = require('./Region'),
    Geometry = require('./Geometry'),
    Promise = require("bluebird");



var API_URL = config.public.apiUrl;

// models

var User = Model.extend({
    type: 'user',
});

var Group = Model.extend({
    type: 'group',
});

var Layer = Model.extend({
    type: 'layer',
});

var Feature = Model.extend({
    type: 'feature',

    getGeometry: function () {
        return Geometry.format.GeoJSON.read(this.data.geom);
    }
});


var DB = O.extend({
    _db : {},

    initialize: function(t) {
        this.transport = t;
    },

    record: function (path, model) {
        this._db[model.id] = {
            'model': model,
            'path': path
        };
        // TODO subscribe to notifications about it
    },

    update: function (model) {
        var self = this,
            db = this._db,
            record = db[model.id],
            path = record.path;
        
        var resolver = function (resolve, reject) {
            self.transport
                .put(API_URL + path, {'body': model })
                    .then(function(){
                        record.model = model;
                        db[model.id] = record;
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

    lookupKey: function (prefix) {
        var pat = new RegExp('^'+prefix+'.*');
        var result = [];
        _.each(this._db, function(val, key){
            if(key.match(pat)){
                result.push(this.get(key));
            }
        }, this);
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
};

var Bind = O.extend({

    initialize: function (options) {
        this.transport = new Transport();
        this.db = new DB(this.transport);
    },

    update: function (model) {
        return this.db.update(model);
    },

    changeParent: function (parentId) {
        if(this.db.has(parentId)){
            var parent = this.db.get(parentId);
            parent.emit('change');
        }
    },

    getMe: function () {
        var db = this.db,
            binder = this;
        var pr = function (response) {
            var u = new User(binder, objectifyResponse(response)),
                url = '/user/'+u.id;

            db.record(url, u);
            return u;
        };

        var url = API_URL+'/auth';
        return this.transport.get(url, {parse: pr});
    },

    getUser: function (userId) {
        var db = this.db,
            path = '/user/'+userId,
            binder = this;

        if(db.has(userId)){
            return Promise.resolve(db.get(userId));
        }
        var pr = function (response) {
            var u = new User(binder, objectifyResponse(response));
            db.record(path, u);
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
            var g = new Group(binder, objectifyResponse(response));
            db.record(path, g);
            return g;
        };
        var url = API_URL+path;
        return this.transport.get(url, {parse: pr});
    },

    getGroups: function (userId, page) {
        var db = this.db,
            binder = this,
            path = '/user/'+userId+'/group/';

        var pr = function (response) {
            var data = objectifyResponse(response);
            var ret = [];
            for(var i = 0; i < data.results.length; i++){
                var g = new Group(binder, data.results[i]);
                db.record(path+g.id, g);
                ret.push(g);
            }
            return ret;
        };
        var url = API_URL+path;
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
            var l = new Layer(binder, objectifyResponse(response));
            db.record(path, l);
            return l;
        };
        var url = API_URL+path;
        return this.transport.get(url, {parse: pr});
    },

    getLayers: function (userId, groupId, page) {
        var db = this.db,
            binder = this,
            path = '/user/'+userId+'/group/'+groupId+'/layer/';

        var pr = function (response) {
            var data = objectifyResponse(response);
            var ret = [];
            for(var i = 0; i < data.results.length; i++){
                var l = new Layer(binder, data.results[i]);
                db.record(path+l.id, l);
                ret.push(l);
            }
            return ret;
        };
        var url = API_URL+path;
        return this.transport.get(url, {parse: pr});
    },

    getFeature: function (userId, groupId, layerId, featureId) {
        var db = this.db,
            binder = this,
            path = '/user/'+userId+'/group/'+groupId+'/layer/'+layerId+'/feature/'+featureId;
        if(db.has(featureId)){
            return Promise.resolve(db.get(featureId));
        }
        var pr = function (response) {
            var f = new Feature(binder, objectifyResponse(response));
            db.record(path, f);
            return f;
        };
        var url = API_URL+path;
        return this.transport.get(url, {parse: pr});
    },

    getFeatures: function (userId, groupId, layerId, extent, page) {
        var db = this.db,
            binder = this,
            path = '/user/'+userId+'/group/'+groupId+'/layer/'+layerId+'/feature/';

        extent = extent || region.get();

        var pr = function (response) {
            var data = objectifyResponse(response);
            var ret = [];
            for(var i = 0; i < data.results.length; i++){
                var f = new Feature(binder, data.results[i]);
                db.record(path+f.id, f);
                ret.push(f);
            }
            return ret;
        };
        var url = API_URL+path;
        var options = {
            'parse': pr,
            'params': extent.toBounds()
        };
        return this.transport.get(url, options);
    },


    setGroup: function (userId, data) {
        var db = this.db,
            binder = this,
            path = '/user/'+userId+'/group/';

        var pr = function (response) {
            var g = new Group(binder, objectifyResponse(response));
            db.record(path + g.id, g);
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
            var g = new Layer(binder, objectifyResponse(response));
            db.record(path + g.id, g);
            binder.changeParent(groupId);
            return g;
        };

        var url = API_URL+path;
        return this.transport.post(url, {
            parse: pr,
            body: data
        });
    },

    setFeature: function (userId, groupId, layerId, data) {
        var db = this.db,
            binder = this,
            path = '/user/'+userId+'/group/'+groupId+'/layer/'+layerId+ '/feature/';

        var pr = function (response) {
            var f = new Feature(binder, objectifyResponse(response));
            db.record(path + f.id, f);
            binder.changeParent(layerId);
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
