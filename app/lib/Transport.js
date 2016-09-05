/*
 * app/lib/Transport.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */


import _ from 'underscore';
import querystring from 'querystring';
import EventEmitter from 'events';
import debug from 'debug';
const logger = debug('waend:Transport');



function transportXHR () {
    return options => {
        const xhr = new XMLHttpRequest();

        const headers = _.omit(options.headers || {}, 'Connection', 'Content-Length');

        const listeners = options.listeners || {};

        function mkLisetner (emitter, eventName, cb, ctx) {
            emitter.addEventListener(eventName, evt => {
                logger('XHR event', eventName);
                cb.apply(ctx, [evt, xhr]);
            }, false);
        }

        for(const listener in listeners){
            const lili = listeners[listener];
            if('upload' === listener) {
                if ('upload' in xhr) {
                    for (let ulistener in lili) {
                        logger('XHR.upload set event handler', ulistener);
                        var cb = lili[ulistener].callback;
                        var ctx = lili[ulistener].context;
                        mkLisetner(xhr.upload, ulistener, cb, ctx);
                    }
                }
            }
            else {
                logger('XHR set event handler', listener);
                var cb = lili.callback;
                var ctx = lili.context;
                mkLisetner(xhr, listener, cb, ctx);
                // xhr.addEventListener(listener, function(evt){
                //     logger('XHR event', listener);
                //     cb.apply(ctx, [evt, xhr]);
                // }, false);
            }
        }

        let url = options.url;
        if('params' in options){
            url += `?${querystring.stringify(options.params)}`;
        }
        xhr.open(options.verb, url, true);

        for(const header in headers) {
            if(!!(headers[header])) {
                try{
                    xhr.setRequestHeader(header, headers[header]);
                }
                catch(err){
                    logger('transportXHR setHeader', err);
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

let httpCookie;

function transportHTTP () {
    const http = require('http');
    const url = require('url');
    return options => {

        const handleResponse = res => {
            let data = '';
            res.setEncoding('utf8');
            if('set-cookie' in res.headers){
                httpCookie = res.headers['set-cookie'];
            }
            res.on('data', chunk => {
                data += chunk;
            });
            res.on('end', () => {
                const cbSuccess = options.listeners.load.callback;
                const cbError = options.listeners.error.callback;
                const ctx = options.listeners.load.context;
                if(res.statusCode >= 400){
                    cbError.apply(ctx, [null, {statusText:new Error(data)}]);
                }
                else{
                    cbSuccess.apply(ctx, [null, {response:data}]);
                }
            });
        };


        const purl = url.parse(options.url);
        let path = purl.path;
        if('params' in options){
            path += `?${querystring.stringify(options.params)}`;
        }

        const headers = options.headers || {};
        if(httpCookie){
            headers['Cookie'] = httpCookie;
        }
        const reqOptions = {
            'method': options.verb,
            'hostname': purl.hostname,
            'port': purl.port || 80,
            'path': path,
            'headers': headers
        };

        ////logger('reqOptions', reqOptions);

        const req = http.request(reqOptions, handleResponse);
        req.on('error', err => {
            const cb = options.listeners.error.callback;
            const ctx = options.listeners.error.context;
            cb.apply(ctx, [null, {statusText:err}]);
        });
        if(options.body){
            req.write(options.body);
        }
        req.end();
    };
}

class Transport extends EventEmitter {

    constructor () {
        super();
        try{
            const www = window;
            this.transport = transportXHR();
        }
        catch(err){
            this.transport = transportHTTP();
        }
    }

    get(url, getOptions) {
        const transport = this.transport;
        getOptions = getOptions || {};

        const resolver = (resolve, reject) => {
            const errorhandler = (evt, xhr) => {
                reject(xhr.statusText);
            };
            const successHandler = (evt, xhr) => {
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

            const options = {
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
    }

    _write(verb, url, postOptions) {
        const transport = this.transport;
        postOptions = postOptions || {};

        const resolver = (resolve, reject) => {
            const errorhandler = (evt, xhr) => {
                reject(xhr.statusText);
            };

            const successHandler = (evt, xhr) => {
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

            const progressHandler = evt => {
                if(_.isFunction(postOptions.progress)){
                    postOptions.progress(
                        evt.lengthComputable,
                        evt.loaded,
                        evt.total
                    );
                }
            };

            let body;
            if(postOptions.headers
                && ('Content-Type' in postOptions.headers)){
                body = postOptions.body;
            }
            else{
                body = ('toJSON' in postOptions.body) ? postOptions.body.toJSON() : JSON.stringify(postOptions.body);
            }
            //logger(body);
            const headers = _.defaults(_.extend({}, postOptions.headers), {
                'Content-Type': 'application/json; charset="utf-8"',
                'Content-Length': body.length
            });


            const options = {
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
    }

    post(url, options) {
        return this._write('POST', url, options);
    }

    put(url, options) {
        return this._write('PUT', url, options);
    }

    del(url, delOptions) {
        const transport = this.transport;
        delOptions = delOptions || {};

        const resolver = (resolve, reject) => {
            const errorhandler = (evt, xhr) => {
                reject(xhr.statusText);
            };
            const successHandler = (evt, xhr) => {
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

            const options = {
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
}



export default Transport;
