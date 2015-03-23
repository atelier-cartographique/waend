/*
 * app/lib/Mutex.js
 *     
 * 
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 * 
 * License in LICENSE file at the root of the repository.
 *
 */

'use strict';


var _ = require('underscore'),
    Promise = require('bluebird'),
    O = require('../../lib/object').Object;


var MutexOptions = ['timeout'];

var Mutex = O.extend({
    timeout: 1000,

    initialize: function (options) {
        _.extend(this, _.pick(options, MutexOptions) || {});
        this._lock = false;
    },

    get: function () {
        if (this._lock) {
            return Promise.reject();
        }
        var self = this;
        var unlock = function (fn, ctx) {
            var defered = function(){
                self._lock = false;
                if (_.isFunction(fn)) {
                    fn.call(ctx);
                }
            };
            _.defer(defered);
        };
        this._lock = true;
        return Promise.resolve(unlock);
    }

});

module.exports = exports = Mutex;
