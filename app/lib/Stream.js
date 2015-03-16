/*
 * app/lib/Stream.js
 *     
 * 
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 * 
 * License in LICENSE file at the root of the repository.
 *
 */


var O = require('../../lib/object').Object,
    Promise = require("bluebird"),
    _ = require('underscore');

'use strict';

var Stream = O.extend({
    
    initialize: function (noAutoOpen) {
        this._entries = [];
        this._open = !(!!noAutoOpen);
    },

    open: function () {
        this._open = true;
    },

    close: function () {
        this._open = false;
    },

    isOpened: function () {
        return !!this._open;
    },

    write: function () {
        if(this.isOpened()){
            var data = _.toArray(arguments);
            this._entries.push(data);
            var args = ['data'].concat(data);
            this.emit.apply(this, args);
        }
    },

    read: function () {
        if(this.isOpened){
            var entry = this._entries.shift();
            if (entry) {
                return Promise.resolve(entry);
            }
            else {
                var self = this;
                var resolver = function (resolve, reject) {
                    self.once('data', function(){
                        var entry = self._entries.shift();
                        resolve.apply(self, entry);
                    });
                };
                return (new Promise(resolver));
            }
        }
        return Promise.reject('stream is closed');
    },

    readSync: function () {
        if(this.isOpened()){
            return this._entries.shift();
        }
    },

    dump: function () {
        var entries = this._entries;
        this._entries = [];
        return entries;
    }
});

module.exports = exports = Stream;
