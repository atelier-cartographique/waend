/*
 * routes/api.js
 *     
 * 
 * Copyright (C) 2014  Pierre Marchand <pierremarc07@gmail.com>
 * 
 * License in LICENSE file at the root of the repository.
 *
 */



var _ = require('underscore');
// var handlers = require('./endpoints/');

var root = '/api/v1/';


// function listHandlers(){
//  console.log('>> listHandlers', handlers.length);
//  var ret = {};
//  _.each(handlers, function(handler){
//      console.log('>> service', handler.modelName);
//      ret[handler.modelName] = handler.getEndpoints(true);
//  });
//  return ret;
// };


// function service(req, res){
//     res.json(listHandlers());
// }

module.exports = exports = function(router, app){

    // router.get(root, service);

    // _.each(handlers, function(handler){
    //     console.log('>> handler', handler.modelName);

    //     var endpoints = handler.getEndpoints(true);

    //     _.each(endpoints, function(endpoint, name){
    //         console.log('    endpoint', name, root + endpoint.url);
    //         router[endpoint.verb](root + endpoint.url,
    //                               _.bind(handler[endpoint.handler], handler));
    //     });

    // });
};