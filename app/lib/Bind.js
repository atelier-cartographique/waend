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



var O = require('../../lib/object').Object;

var Bind = O.extend({

    initialize: function (options) {
        this.db = {};
    },

    create: function (type, id) {
        if(!(type in this.db)){
            this.db[type] = {};
        }
        if(!(id in this.db[type])){
            this.db[type][id] = {
                views: [],
                model: undefined
            }
        }
    },

});

var bindInstance = null;

module.exports.configure = function (config) {
    if(bindInstance){
        throw (new Error('Bind already configured'));
    }
    bindInstance = new Bind(config);
};


module.exports.get = function () {
    if(!bindInstance){
        throw (new Error('Bind not configured'));
    }
    return bindInstance;
};
