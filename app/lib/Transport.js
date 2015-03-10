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
    O = require('../../lib/object').Object,
    Promise = require("bluebird");




function transportXHR () {
    return function (options) {
        var xhr = new XMLHttpRequest();
        
        var headers = options.headers || {};
        for(var header in headers) {
            xhr.setRequestHeader(header, headers[header]);
        }

        var listeners = options.listeners || {};
        for(var listener in listeners){
            var cb = listeners[listeners].callback;
            var ctx = listeners[listeners].context;
            var wrapper = function(evt){
                cb.apply(ctx, [evt, xhr]);
            };
            xhr.on(listener, wrapper, false);
        }

        xhr.open(options.verb, options.url, true);

        if('beforeSend' in options){
            options.beforeSend(xhr);
        }
        xrh.responseType = "json";
        xhr.send(options.body);
        return xhr;
    };
};

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
        var headers = options.headers || {};
        if(httpCookie){
            headers['Cookie'] = httpCookie;
        }
        var reqOptions = {
            'method': options.verb,
            'hostname': purl.hostname,
            'port': purl.port || 80,
            'path': purl.path,
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
};

var Transport = O.extend({

    initialize: function () {
        if(process) {
            this.transport = transportHTTP();
        }
        else{
            this.transport = transportXHR();
        }
    },

    get: function(url, getOptions) {
        var transport = this.transport,
            getOptions = getOptions || {};

        var resolver = function (resolve, reject) {
            var errorhandler = function (evt, xhr) {
                reject(xhr.statusText);
            };
            var successHandler = function (evt, xhr) {
                ////console.log('transport.get.success', evt, xhr);
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
                'verb': 'GET',
                'url': url
            };

            transport(options);
        };

        return new Promise(resolver);
    },

    _write: function(verb, url, postOptions) {
        var transport = this.transport,
            getOptions = getOptions || {};

        var resolver = function (resolve, reject) {
            var errorhandler = function (evt, xhr) {
                reject(xhr.statusText);
            };
            var successHandler = function (evt, xhr) {
                ////console.log('transport.get.success', evt, xhr);
                if(postOptions.parse){
                    resolve(postOptions.parse(xhr.response));
                }
                else{
                    resolve(xhr.response);
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
                },
                'headers': headers,
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
});



module.exports = exports = Transport;

