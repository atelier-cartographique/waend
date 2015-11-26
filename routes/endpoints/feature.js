/*
 * routes/endpoints/entity.js
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
                url: 'user/:user_id/group/:group_id/layer/:layer_id/feature/',
                permissions: ['ownsGroupOrPublic']
            },

            get: {
                verb: 'get',
                handler: 'get',
                url: 'user/:user_id/group/:group_id/layer/:layer_id/feature/:feature_id',
                permissions: ['ownsGroupOrPublic']
            },

            post: {
                verb: 'post',
                handler: 'post',
                url: 'user/:user_id/group/:group_id/layer/:layer_id/feature/',
                permissions: ['isAuthenticated', 'isLayerOwner']
            },

            put: {
                verb: 'put',
                handler: 'put',
                url: 'user/:user_id/group/:group_id/layer/:layer_id/feature/:feature_id',
                permissions: ['isAuthenticated', 'isLayerOwner']
            },

            del: {
                verb: 'delete',
                handler: 'del',
                url: 'user/:user_id/group/:group_id/layer/:layer_id/feature.:geom_type/:feature_id',
                permissions: ['isAuthenticated', 'isLayerOwner']
            }
        },


        list: function (request, response) {
            var self = this,
                bounds = _.mapObject(_.pick(request.query, 'n', 'e', 's', 'w'), function(v){ return parseFloat(v); });
            cache.client()
                .getFeatures(request.params.layer_id, bounds)
                .then(function(results){
                    self.paginate(results, request, response);
                })
                .catch(function(err){
                    response.status(500).send(err);
                });
        },

        get: function (request, response) {
            cache.client()
                .getFeature(request.params.feature_id)
                .then(function(data){
                    response.send(data);
                })
                .catch(function(err){
                    response.status(404).send(err);
                });
        },


        post: function (request, response) {
            var layerId = request.params.layer_id,
                body = _.extend(request.body, {
                    'user_id': request.user.id
                });

            cache.client()
                .setFeature(body)
                .then(function(feature){
                    response.status(201).send(feature);
                    notifier.create('layer', layerId, feature);
                })
                .catch(function(err){
                    response.status(500).send(err);
                });
        },


        put: function (request, response) {
            var layerId = request.params.layer_id,
                body = _.extend(request.body, {
                'user_id': request.user.id,
                'layer_id': layerId,
                'id': request.params.feature_id
            });
            cache.client()
                .setFeature(body)
                .then(function(data){
                    response.send(data);
                    notifier.update('layer', layerId, data);
                })
                .catch(function(err){
                    response.status(500).send(err);
                });
        },

        del: function (request, response) {
            var lid = request.params.layer_id,
                fid = request.params.feature_id,
                geomType = request.params.geom_type.toLowerCase();

            cache.client()
                .delFeature(lid, fid, geomType)
                .then(function(){
                    response.status(204).end();
                    notifier.delete('layer', lid, fid);
                })
                .catch(function(err){
                    response.status(500).send(err);
                });
        }

    });
