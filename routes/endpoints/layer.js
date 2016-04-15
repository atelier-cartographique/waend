/*
 * routes/endpoints/layer.js
 *
 *
 * Copyright (C) 2014  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */

var _ = require('underscore'),
    base = require('./base'),
    cache = require('../../lib/cache'),
    notifier = require('../../lib/notifier');


module.exports = exports = base.RequestHandler.extend({


    endpoints: {

        list: {
            verb: 'get',
            handler: 'list',
            url: 'user/:user_id/group/:group_id/layer/',
            permissions: ['ownsGroupOrPublic']
        },

        get: {
            verb: 'get',
            handler: 'get',
            url: 'user/:user_id/group/:group_id/layer/:layer_id',
            permissions: ['ownsGroupOrPublic']
        },

        post: {
            verb: 'post',
            handler: 'post',
            url: 'user/:user_id/group/:group_id/layer/',
            permissions: ['isAuthenticated', 'ownsGroupOrPublic']
        },

        put: {
            verb: 'put',
            handler: 'put',
            url: 'user/:user_id/group/:group_id/layer/:layer_id',
            permissions: ['isAuthenticated', 'isLayerOwner']
        }
    },


    list: function (request, response) {
        var self = this;
        cache.client()
            .getLayers(request.params.group_id)
            .then(function(results){
                self.paginate(results, request, response);
            })
            .catch(function(err){
                response.status(500).send(err);
            });
    },

    get: function (request, response) {
        cache.client()
            .get('layer', request.params.layer_id)
            .then(function(data){
                response.send(data);
            })
            .catch(function(err){
                response.status(404).send(err);
            });
    },


    post: function (request, response) {
        var groupId = request.params.group_id,
            body = _.extend(request.body, {
                'user_id': request.user.id
            });

        cache.client()
            .set('layer', body)
            .then(function(layer){
                var compositionData = {
                    'layer_id': layer.id,
                    'group_id': groupId
                };
                cache.client()
                    .set('composition', compositionData)
                    .then(function(/* composition */){
                        response.status(201).send(layer);
                    });
            })
            .catch(function(err){
                response.status(500).send(err);
            });
    },


    put: function (request, response) {
        var layerId = request.params.layer_id,
            body = _.extend(request.body, {
                'user_id': request.user.id,
                'id': layerId
            });
        cache.client()
            .set('layer', body)
            .then(function(data){
                response.send(data);
                notifier.update('layer', layerId, data);
            })
            .catch(function(err){
                response.status(500).send(err);
            });
    },


});
