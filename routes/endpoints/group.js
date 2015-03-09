/*
 * routes/endpoints/user.js
 *     
 * 
 * Copyright (C) 2014  Pierre Marchand <pierremarc07@gmail.com>
 * 
 * License in LICENSE file at the root of the repository.
 *
 */



var _ = require('underscore'),
    base = require('./base'),
    cache = require('../../lib/cache');

function increment(a){
    a = a + 1;
    return a;
};

function decrement(a){
    a = a - 1;
    return a;
};

module.exports = exports = base.RequestHandler.extend({

        endpoints: {
            search: {
                verb: 'get',
                handler: 'searchGroups',
                url: 'group/:term'
            },

            get: {
                verb: 'get',
                handler: 'get',
                url: 'user/:user_id/group/:group_id',
                permissions: ['ownsGroupOrPublic']
            },

            post: {
                verb: 'post',
                handler: 'post',
                url: 'user/:user_id/group/',
                permissions: ['isAuthenticated', 'isUser']
            },

            put: {
                verb: 'put',
                handler: 'put',
                url: 'user/:user_id/group/:group_id',
                permissions: ['isAuthenticated', 'isUser', 'isGroupOwner']
            },
        },

        searchGroups: function(request, response){
            var self = this;
            cache.client()
                .lookupGroups(request.params.term)
                .then(function(results){
                    self.paginate(results, request, response);
                })
                .catch(function(err){
                    response.status(500).send(err);
                });
        },

        get: function(request, response) {
            cache.client()
                .get('group', request.params.group_id)
                .then(function(data){
                    response.send(data);
                })
                .catch(function(err){
                    response.status(404).send(err);
                });
        },

        post: function (request, response) {
            var body = request.body;
            cache.client()
                .set('group', body)
                .then(function(data){
                    response.status(201).send(data);
                })
                .catch(function(err){
                    response.status(500).send(err);
                });
        },

        put: function (request, response) {
            var body = request.body;
            cache.client()
                .set('group', body)
                .then(function(data){
                    response.send(data);
                })
                .catch(function(err){
                    response.status(500).send(err);
                });
        },

        layer: function(request, response) {

        },

        subscribe: function(request, response){

        },

        unsubscribe: function(request, response){

        },

        attach: function(request, response){
            
        },

        detach: function(request, response){
            
        },

        moveLayer: function(request, response){
            
        }
    });
