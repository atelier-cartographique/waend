/*
 * app/lib/Model.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */


var _ = require('underscore'),
    O = require('../../lib/object').Object,
    Promise = require("bluebird");

function pathKey (obj, path, def) {
    path = path.split('.');
    for(var i = 0, len = path.length; i < len; i++){
        if (!obj || (typeof obj !== 'object')) {
            return def;
        }
        obj = obj[path[i]];
    }
    if (obj === undefined) {
        return def;
    }
    return obj;
}


var Model = O.extend({
    constructor: function(binder, data) {
        this.binder = binder;
        this.data = data;
        this.id = data.id; // read-only: TODO objectpropertize accordingly
        O.apply(this, [data]);
    },

    getPath: function () {
        return this.binder.getComps(this.id);
    },

    isNew: function () {
        return !('id' in this.data);
    },

    has: function (prop) {
        return (prop in this.data.properties);
    },

    get: function (key, def) {
        return pathKey(this.data.properties, key, def);
    },

    getData: function () {
        return JSON.parse(JSON.stringify(this.data.properties));
    },

    set: function (key, val) {
        var keys = key.split('.');
        var props = this.data.properties;
        if (1 === keys.length) {
            props[key] = val;
        }
        else {
            var kl = keys.length,
                currentDict = props,
                k;
            for (var i = 0; i < kl; i++) {
                k = keys[i];
                if ((i + 1) === kl) {
                    currentDict[k] = val;
                }
                else {
                    if (!(k in currentDict)) {
                        currentDict[k] = {};
                    }
                    else if (!_.isObject(currentDict[k])) {
                        currentDict[k] = {};
                    }
                    currentDict = currentDict[k];
                }
            }
        }
        this.emit('set', key, val);
        return this.binder.update(this);
    },

    setData: function (data) {
        this.data.properties = data;
        this.emit('set:data', data);
        return this.binder.update(this);
    },

    toJSON: function () {
        return JSON.stringify(this.data);
    },

    _updateData: function (data, silent) {
        var changed = _.isEqual(data, this.data);
        this.data = data;
        if (!silent && changed) {
            this.emit('change', data);
        }
    }

});


module.exports = exports = Model;
