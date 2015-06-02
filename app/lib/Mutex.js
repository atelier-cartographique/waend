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


var MutexOptions = ['queueLength'];

var Mutex = O.extend({
    queueLength: 128,

    initialize: function (options) {
        _.extend(this, _.pick(options, MutexOptions) || {});

        this._queue = 0;
        this.setMaxListeners(this.queueLength);
    },

    get: function () {

        console.log('mutex.get', this._queue);
        var self = this;
        var unlock = function (fn, ctx) {
            console.log('mutex.unlock', self._queue);
            self._queue -= 1;
            self.emit('unlock', self._queue);
            var defered = function(){
                if (_.isFunction(fn)) {
                    fn.call(ctx);
                }
            };
            _.defer(defered);
        };

        if (self._queue > 0) {
            var resolver = function (resolve, reject) {
                if (self._queue >= self.queueLength) {
                    return reject('QueueLengthExceeded');
                }
                var index = self._queue;
                self._queue += 1;
                console.log('mutex.queue', self._queue);
                var listId;
                var listener = function(q) {
                    if (q <= index) {
                        self.offById(listId);
                        resolve(unlock);
                    }
                };
                listId = self.on('unlock', listener);
            };
            return (new Promise(resolver));
        }
        self._queue += 1;
        return Promise.resolve(unlock);
    }

});

module.exports = exports = Mutex;
