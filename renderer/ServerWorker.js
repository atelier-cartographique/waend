/*
 * app/src/ServerWorker.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */

// 'use strict';


var _ = require('underscore'),
    WorkerContext = require('./WorkerContext'),
    O = require('../lib/object').Object;

var WWorker = O.extend({

    initialize: function (fn, locals) {
        this.fn = fn;
        this.locals = locals;
    },

    post: function () {
        var args = _.toArray(arguments),
            name = args.shift(),
            data = {
                'name': name,
                'args': args
            };
        // this.emit('message', {'data': data});
        this.wc.messageHandler({'data': data});
    },

    start: function() {
        this.wc = new WorkerContext(this);
        this.fn(this.wc);
        this.wc.on('error', this.onErrorHandler());
        // this.post({});
    },

    stop: function () {
        this.w.terminate();
    },

    onMessageHandler: function () {
        var self = this;
        // console.log('onMessageHandler', arguments);
        // var handler = function (event) {
            self.emit.apply(self, arguments);
        // };
        // return handler;
    },

    onErrorHandler: function () {
        var self = this;
        var handler = function (event) {
            console.error(event);
        };
        return handler;
    }
});

module.exports = exports = WWorker;
