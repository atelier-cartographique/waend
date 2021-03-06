/*
 * app/lib/Transport.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */


var _ = require('underscore'),
    querystring = require('querystring'),
    O = require('../../lib/object').Object,
    Promise = require("bluebird");




function transportXHR () {
    return function (options) {
        var xhr = new XMLHttpRequest();

        var headers = _.omit(options.headers || {}, 'Connection', 'Content-Length');

        var listeners = options.listeners || {};

        function mkLisetner (emitter, eventName, cb, ctx) {
            emitter.addEventListener(eventName, function(evt){
                console.log('XHR event', eventName);
                cb.apply(ctx, [evt, xhr]);
            }, false);
        }

        for(var listener in listeners){
            var lili = listeners[listener];
            if('upload' === listener) {
                if ('upload' in xhr) {
                    for (ulistener in lili) {
                        console.log('XHR.upload set event handler', ulistener);
                        var cb = lili[ulistener].callback;
                        var ctx = lili[ulistener].context;
                        mkLisetner(xhr.upload, ulistener, cb, ctx);
                    }
                }
            }
            else {
                console.log('XHR set event handler', listener);
                var cb = lili.callback;
                var ctx = lili.context;
                mkLisetner(xhr, listener, cb, ctx);
                // xhr.addEventListener(listener, function(evt){
                //     console.log('XHR event', listener);
                //     cb.apply(ctx, [evt, xhr]);
                // }, false);
            }
        }

        var url = options.url;
        if('params' in options){
            url += '?'+querystring.stringify(options.params);
        }
        xhr.open(options.verb, url, true);

        for(var header in headers) {
            if(!!(headers[header])) {
                try{
                    xhr.setRequestHeader(header, headers[header]);
                }
                catch(err){
                    console.log('transportXHR setHeader', err);
                }
            }
        }

        if('beforeSend' in options){
            options.beforeSend(xhr);
        }
        xhr.responseType = "json";
        xhr.send(options.body);
        return xhr;
    };
}

var httpCookie;

function transportHTTP () {
    var http = require('http'),
        url = require('url');
    return function (options) {

        var handleResponse = function(res) {
            var data = '';
            res.setEncoding('utf8');
            if('set-cookie' in res.headers){
                httpCookie = res.headers['set-cookie'];
            }
            res.on('data', function (chunk) {
                data += chunk;
            });
            res.on('end', function(){
                var cbSuccess = options.listeners.load.callback,
                    cbError = options.listeners.error.callback,
                    ctx = options.listeners.load.context;
                if(res.statusCode >= 400){
                    cbError.apply(ctx, [null, {statusText:new Error(data)}]);
                }
                else{
                    cbSuccess.apply(ctx, [null, {response:data}]);
                }
            });
        };


        var purl = url.parse(options.url);
        var path = purl.path;
        if('params' in options){
            path += '?'+querystring.stringify(options.params);
        }

        var headers = options.headers || {};
        if(httpCookie){
            headers['Cookie'] = httpCookie;
        }
        var reqOptions = {
            'method': options.verb,
            'hostname': purl.hostname,
            'port': purl.port || 80,
            'path': path,
            'headers': headers
        };

        ////console.log('reqOptions', reqOptions);

        var req = http.request(reqOptions, handleResponse);
        req.on('error', function(err) {
            var cb = options.listeners.error.callback,
                ctx = options.listeners.error.context;
            cb.apply(ctx, [null, {statusText:err}]);
        });
        if(options.body){
            req.write(options.body);
        }
        req.end();
    };
}

var Transport = O.extend({

    initialize: function () {
        try{
            var www = window;
            this.transport = transportXHR();
        }
        catch(err){
            this.transport = transportHTTP();
        }
    },

    get: function(url, getOptions) {
        var transport = this.transport;
        getOptions = getOptions || {};

        var resolver = function (resolve, reject) {
            var errorhandler = function (evt, xhr) {
                reject(xhr.statusText);
            };
            var successHandler = function (evt, xhr) {
                if(xhr.status >= 400){
                    return reject(xhr.statusText);
                }
                if(getOptions.parse){
                    resolve(getOptions.parse(xhr.response));
                }
                else{
                    resolve(xhr.response);
                }
            };

            var options = {
                'listeners': {
                    'error' : {callback:errorhandler, context:undefined},
                    'abort' : {callback:errorhandler, context:undefined},
                    'timeout' : {callback:errorhandler, context:undefined},
                    'load' : {callback:successHandler, context:undefined},
                },
                'headers': _.extend({}, getOptions.headers),
                'params': getOptions.params,
                'verb': 'GET',
                'url': url
            };

            transport(options);
        };

        return new Promise(resolver);
    },

    _write: function(verb, url, postOptions) {
        var transport = this.transport;
        postOptions = postOptions || {};

        var resolver = function (resolve, reject) {
            var errorhandler = function (evt, xhr) {
                reject(xhr.statusText);
            };

            var successHandler = function (evt, xhr) {
                if(xhr.status >= 400){
                    return reject(xhr.statusText);
                }
                if(postOptions.parse){
                    resolve(postOptions.parse(xhr.response));
                }
                else{
                    resolve(xhr.response);
                }
            };

            var progressHandler = function (evt) {
                if(_.isFunction(postOptions.progress)){
                    postOptions.progress(
                        evt.lengthComputable,
                        evt.loaded,
                        evt.total
                    );
                }
            };

            var body;
            if(postOptions.headers
                && ('Content-Type' in postOptions.headers)){
                body = postOptions.body;
            }
            else{
                body = ('toJSON' in postOptions.body) ? postOptions.body.toJSON() : JSON.stringify(postOptions.body);
            }
            //console.log(body);
            var headers = _.defaults(_.extend({}, postOptions.headers), {
                'Content-Type': 'application/json; charset="utf-8"',
                'Content-Length': body.length
            });


            var options = {
                'listeners': {
                    'error' : {callback:errorhandler, context:undefined},
                    'abort' : {callback:errorhandler, context:undefined},
                    'timeout' : {callback:errorhandler, context:undefined},
                    'load' : {callback:successHandler, context:undefined},
                    'upload': {
                        'progress': {callback:progressHandler, context:undefined}
                    }
                },
                'headers': headers,
                'params': postOptions.params,
                'verb': verb,
                'body': body,
                'url': url
            };

            transport(options);
        };

        return new Promise(resolver);
    },

    post: function(url, options) {
        return this._write('POST', url, options);
    },

    put: function(url, options) {
        return this._write('PUT', url, options);
    },

    del: function(url, delOptions) {
        var transport = this.transport;
        delOptions = delOptions || {};

        var resolver = function (resolve, reject) {
            var errorhandler = function (evt, xhr) {
                reject(xhr.statusText);
            };
            var successHandler = function (evt, xhr) {
                if(xhr.status >= 400){
                    return reject(xhr.statusText);
                }
                if(delOptions.parse){
                    resolve(delOptions.parse(xhr.response));
                }
                else{
                    resolve(xhr.response);
                }
            };

            var options = {
                'listeners': {
                    'error' : {callback:errorhandler, context:undefined},
                    'abort' : {callback:errorhandler, context:undefined},
                    'timeout' : {callback:errorhandler, context:undefined},
                    'load' : {callback:successHandler, context:undefined},
                },
                'headers': _.extend({}, delOptions.headers),
                'params': delOptions.params,
                'verb': 'DELETE',
                'url': url
            };

            transport(options);
        };

        return new Promise(resolver);
    }
});



module.exports = exports = Transport;
