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



var O = require('../../lib/object').Object,
    Transport = require('./Transport'),
    Model = require('./Model'),
    config = require('../../config'),
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

    set: function (path, data) {

    },

    has: function (id) {
        return (id in this._db);
    },

    get: function (id) {
        return this._db[id].model;
    },
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
            db.record(path, g);
            return l;
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

    setGroup: function (userId, data) {
        var db = this.db,
            binder = this,
            path = '/user/'+userId+'/group/';

        var pr = function (response) {
            var g = new Group(binder, objectifyResponse(response));
            db.record(path + g.id, g);
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
            return g;
        };

        var url = API_URL+path;
        return this.transport.post(url, {
            parse: pr,
            body: data
        });
    },

});

var bindInstance = null;

module.exports.get = function () {
    if(!bindInstance){
        bindInstance = new Bind();
    }
    return bindInstance;
};
