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


module.exports = exports = base.RequestHandler.extend({

        endpoints: {
            me: {
                verb: 'get',
                handler: 'getMe',
                url: 'auth',
                permissions: ['isAuthenticated']
            },

            get:{
                verb: 'get',
                handler: 'get',
                url: 'user/:user_id'
            },

            put:{
                verb: 'put',
                handler: 'put',
                url: 'user/:user_id',
                permissions: ['isAuthenticated', 'isUser']
            }
        },

        get: function (request, response) {
            cache.client()
                .get('user', request.params.user_id)
                .then(function(data){
                    response.send(data);
                })
                .catch(function(err){
                    response.status(404).send(err);
                });
        },

        put: function (request, response) {
            var body = request.body;
            cache.client()
                .set('user', body)
                .then(function(data){
                    response.send(data);
                })
                .catch(function(err){
                    response.status(500).send(err);
                });
        },

        getMe: function(req, res){
            cache.client()
                .get('user', req.user.id)
                .then(function(data){
                    res.send(data);
                })
                .catch(function(err){
                    res.status(500).send(err);
                });
        },

    });
