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
        if (model.id in this._db) {
            this._db[model.id].model._updateData(model.data);
        }
        else {
            this._db[model.id] = {
                'model': model,
                'path': path
            };
            // TODO subscribe to notifications about it
        }
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
        this.featurePages = {};
    },

    update: function (model) {
        return this.db.update(model);
    },

    changeParent: function (parentId) {
        if(this.db.has(parentId)){
            var parent = this.db.get(parentId);
            console.log('binder.changeParent', parent.id);
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

    setFeaturePage: function (path, data) {
        if (!(path in this.featurePages)) {
            this.featurePages[path] = new Array(data.pageCount);
        }
        var ids = [];
        for (var i = 0; i < data.results.length; i++) {
            var mdata = data.results[i];
            ids.push(mdata.id);
        }
        this.featurePages[path][data.page] = ids;
    },

    hasFeaturePage: function (path, page) {
        return ((path in this.featurePages) 
                && (page < this.featurePages[path].length) 
                && (_.isArray(this.featurePages[path][page])));
    },

    getFeaturePage: function (path, page) {
        var pages = this.featurePages[path],
            row = pages[page]
            ret = [];

        for (var i = 0; i < row.length; i++) {
            ret.push(this.db.get(row[i]));
        }

        return ret;
    },

    getFeatureAllPages: function (path) {
        var pages = this.featurePages[path],
            ret = [];

        for (var p = 0; p < pages.length; p++) {
            var row = pages[p];
            if(_.isArray(row)) {
                for (var i = 0; i < row.length; i++) {
                    ret.push(this.db.get(row[i]));
                }
            }
        }

        return ret;
    },

    getFeatures: function (userId, groupId, layerId, page) {
        var self = this,
            db = this.db,
            binder = this,
            path = '/user/'+userId+'/group/'+groupId+'/layer/'+layerId+'/feature/';

        if (page) {
            if(this.hasFeaturePage(path, page)) {
                return Promise.resolve(this.getFeaturePage(path, page));
            }
        }
        else if (this.hasFeaturePage(path, 0)) { // we're loading, retrieve what we can
            return Promise.resolve(this.getFeatureAllPages(path));
        }

        page = page || 0;
        

        var pr = function (response) {
            var data = objectifyResponse(response),
                ret = [];
            for(var i = 0; i < data.results.length; i++){
                var f = new Feature(binder, data.results[i]);
                db.record(path+f.id, f);
                ret.push(f);
            }
            self.setFeaturePage(path, data);
            var nextPage = data.page + 1;
            if (nextPage < data.pageCount) {
                _.defer(function(){
                    self.getFeatures(userId, groupId, layerId, nextPage);
                });
            }
            return ret;
        };
        var url = API_URL+path;
        var options = {
            'parse': pr,
            'params': _.extend({'page': page}, region.getWorldExtent().toBounds())
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

    setFeature: function (userId, groupId, layerId, data, batch) {
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
        if (!!batch) {
            return this.transport.post(url, {
                body: data
            });
        }
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
