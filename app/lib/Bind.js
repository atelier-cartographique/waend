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

    set: function (url, model) {
        var self = this;
        self._db[url] = model;
        model.on('change', function(){
            self.transport
                .put(API_URL + url, {'body': model })
                .then(function(){
                    model.emit('sync', model);
                });
        });
    },

    has: function (url) {
        return (url in this._db);
    },

    get: function (url) {
        return this._db[url];
    },
});


var Bind = O.extend({

    initialize: function (options) {
        this.transport = new Transport();
        this.db = new DB(this.transport);
    },

    getMe: function () {
        var db = this.db;
        var pr = function (response) {
            var u = new User(JSON.parse(response)),
                url = '/user/'+u.id;

            db.set(url, u);
            return u;
        };

        var url = API_URL+'/auth';
        return this.transport.get(url, {parse: pr});
    },

    getUser: function (userId) {
        var db = this.db,
            path = '/user/'+userId;

        if(db.has(path)){
            return Promise.resolve(db.get(path));
        }
        var pr = function (response) {
            var u = new User(JSON.parse(response));
            db.set(path, u);
            return u;
        };
        var url = API_URL+path;
        return this.transport.get(url, {parse: pr});
    },

    getGroup: function (userId, groupId) {
        var db = this.db,
            path = '/user/'+userId+'/group/'+groupId;
        if(db.has(path)){
            return Promise.resolve(db.get(path));
        }
        var pr = function (response) {
            var g = new Group(JSON.parse(response));
            db.set(path, g);
            return g;
        };
        var url = API_URL+path;
        return this.transport.get(url, {parse: pr});
    },

    getLayer: function (userId, groupId, layerId) {

    },

    getFeature: function (userId, groupId, layerId, featureId) {

    },

});

var bindInstance = null;

module.exports.get = function () {
    if(!bindInstance){
        bindInstance = new Bind();
    }
    return bindInstance;
};
