/*
 * app/lib/Model.js
 *     
 * 
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 * 
 * License in LICENSE file at the root of the repository.
 *
 */


var O = require('../../lib/object').Object,
    Promise = require("bluebird");


var Model = O.extend({
    constructor: function(data) {
        this.data = data;
        this.id = data.id; // read-only: TODO objectpropertize accordingly
        O.apply(this, [data]);
    },

    isNew: function () {
        return !('id' in this.data);
    },

    get: function (prop) {
        return this.data.properties[prop];
    },

    getData: function () {
        return JSON.parse(JSON.stringify(this.data.properties));
    },

    set: function (key, val) {
        this.data.properties[key] = val;
        this.emit('change', this);
    },

    setData: function (data) {
        this.data.properties = data;
        this.emit('change', this);
    },

    toJSON: function () {
        return JSON.stringify(this.data);
    }

});


module.exports = exports = Model;
