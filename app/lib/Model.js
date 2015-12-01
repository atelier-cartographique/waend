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
    Geometry = require('./Geometry'),
    Promise = require('bluebird');

var binder;

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
    constructor: function(data) {
        this.data = data;
        this.id = data.id; // read-only: TODO objectpropertize accordingly
        O.apply(this, [data]);

        // delay binder loading, ugly but still better than having
        // a refernce to it on each model.
        if(!binder) {
            var Bind = require('./Bind');
            binder = Bind.get();
        }
    },

    getPath: function () {
        return binder.getComps(this.id);
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
        return binder.update(this);
    },

    setData: function (data) {
        this.data.properties = data;
        this.emit('set:data', data);
        return binder.update(this);
    },

    toJSON: function () {
        return JSON.stringify(this.data);
    },

    _updateData: function (data, silent) {
        var props = this.data.properties,
            newProps = data.properties,
            changedProps = [],
            changedAttrs = [],
            changedKeys = _.difference(_.keys(props), _.keys(newProps)).concat(_.difference(_.keys(newProps), _.keys(props)));

        _.each(props, function(v, k) {
            if (!_.isEqual(v, newProps[k])) {
                changedProps.push(k);
            }
        });

        _.each(this.data, function(v, k) {
            if ('properties' !== k) {
                if (!_.isEqual(v, data[k])) {
                    changedAttrs.push(k);
                }
            }
        });


        this.data = data;
        if (!silent
            && ((changedAttrs.length > 0)
                || (changedProps.length > 0)
                || (changedKeys.length > 0)) ) {
            this.emit('set:data', data);
            _.each(changedProps, function(k) {
                this.emit('set', k, data.properties[k]);
            }, this);
        }
    }

});

module.exports.Model = Model;
// models

module.exports.User = Model.extend({
    type: 'user',
});

module.exports.Group = Model.extend({
    type: 'group',
});

module.exports.Layer = Model.extend({
    type: 'layer',
});

module.exports.Feature = Model.extend({
    type: 'feature',

    getGeometry: function () {
        return (new Geometry.Geometry(this.data.geom));
    },

    setGeometry: function(geom) {
        if (geom instanceof Geometry.Geometry) {
            this.data.geom = geom.toGeoJSON();
        }
        else {
            this.data.geom = geom;
        }
        this.emit('set', 'geom', this.getGeometry());
        return binder.update(this);
    }
});
