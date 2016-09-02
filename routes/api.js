/*
 * routes/api.js
 *
 *
 * Copyright (C) 2014  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */



var logger = require('debug')('routes/api'),
    _ = require('underscore'),
    handlers = require('./endpoints/');

var root = '/api/v1/';


function listHandlers(){
    logger('>> listHandlers', handlers.length);
    var ret = {};
    _.each(handlers, function(handler){
        logger('>> service', handler.modelName);
        ret[handler.modelName] = handler.getEndpoints();
    });

    return ret;
}


function service(req, res){
    res.json(listHandlers());
}

module.exports = exports = function(router, app){

    router.get(root, service);

    _.each(handlers, function(handler){

        var endpoints = handler.getEndpoints(true);

        _.each(endpoints, function(endpoint, name){
            var args = [],
                routing = router[endpoint.verb],
                endpointUrl = root + endpoint.url,
                endpointHandler = _.bind(handler[endpoint.handler], handler);

            args.push(endpointUrl);

            if('permissions' in endpoint){
                for(var pidx = 0; pidx < endpoint.permissions.length; pidx++){
                    var permissionName = endpoint.permissions[pidx];
                    args.push(_.bind(handler[permissionName], handler));
                }
            }

            args.push(endpointHandler);
            routing.apply(router, args);
        });

    });
};
