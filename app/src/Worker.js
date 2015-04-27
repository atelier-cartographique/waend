/*
 * app/src/Worker.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */

'use strict';


var _ = require('underscore'),
    config = require('../../config'),
    O = require('../../lib/object').Object;

var BIN_URL = config.public.binUrl;

var WWorker = O.extend({

    initialize: function (fn, locals) {
        this.fn = fn;
        this.locals = locals;
    },

    wrapBody: function () {
        var body = [
            'importScripts("' + BIN_URL + '/libworker.js");'
            ];
        for (var k in this.locals) {
            try{
                body.push( 'workerContext.waend["' + k + '"] = ' + this.locals[k].toString() +';');
            }
            catch (err) {
                console.log('could not load local in worker', k, err);
            }
        }

        body = body.concat([
            '('+ this.fn.toString() + ')(waend);'
        ]);

        return body.join('\n');
    },

    post: function () {
        var args = _.toArray(arguments),
            name = args.shift();
        this.w.postMessage({
            'name': name,
            'args': args
        });
    },

    start: function() {
        var body = this.wrapBody();

    // http://stackoverflow.com/questions/10343913/how-to-create-a-web-worker-from-a-string#10372280
        var URL = window.URL || window.webkitURL;
        var blob;

        try {
            blob = new Blob([body], {type: 'application/javascript'});
        }
        catch (err) { // Backwards-compatibility
            var BlobBuilder = window.BlobBuilder || window.WebKitBlobBuilder || window.MozBlobBuilder;
            blob = new BlobBuilder();
            blob.append(body);
            blob = blob.getBlob();
        }

        this.w = new Worker(URL.createObjectURL(blob));
        this.w.addEventListener('message', this.onMessageHandler(), false);
        this.w.addEventListener('error', this.onErrorHandler(), false);
        this.w.postMessage({});
    },

    stop: function () {
        this.w.terminate();
    },

    onMessageHandler: function () {
        var self = this;
        var handler = function (event) {
            self.emit.apply(self, event.data);
        };
        return handler;
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
