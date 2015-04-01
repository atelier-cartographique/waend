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
            search: {
                verb: 'get',
                handler: 'searchGroups',
                url: 'group/:term'
            },

            list: {
                verb: 'get',
                handler: 'list',
                url: 'user/:user_id/group/'
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

            attach: {
                verb: 'post',
                handler: 'attach',
                url: 'user/:user_id/group/:group_id/attach/',
                permissions: ['isAuthenticated']
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
                // .get('group', request.params.group_id)
                .getGroup(request.params.group_id)
                .then(function(data){
                    response.send(data);
                })
                .catch(function(err){
                    response.status(404).send(err);
                });
        },

        list: function (request, response) {
            var self = this,
                listPrivate = false;
            if(request.user
                && (request.user.id === request.params.user_id)) {
                listPrivate = true;
            }
            cache.client()
                .getMaps(request.params.user_id)
                .then(function(results){
                    // console.log('groups.list results', results);
                    if(!!listPrivate){
                        self.paginate(results, request, response);
                    }
                    else{
                        var data = _.filter(results, function(g){ return (0 === g.status_flag);});
                        // console.log('groups.list public', data);
                        self.paginate(data, request, response);
                    }
                })
                .catch(function(err){
                    console.error('groups.list error', err);
                    response.status(500).send(err);
                });
        },

        post: function (request, response) {
            var body = _.extend(request.body, {
                    'user_id': request.user.id
                });

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
            var body = _.extend(request.body, {
                    'user_id': request.user.id,
                    'id': request.params.group_id
                });
            cache.client()
                .set('group', body)
                .then(function(data){
                    response.send(data);
                })
                .catch(function(err){
                    response.status(500).send(err);
                });
        },

        attach: function(request, response){
            var body = request.body,
                layerId = body.layer_id,
                userId = request.user.id;

            cache.client()
                .get('layer', layerId)
                .then(function(layer){
                    if(layer.user_id !== userId){
                        return response.status(403).send('Not Your Layer');
                    }
                    cache.client()
                        .set('composition', body)
                        .then(function(){
                            response.status(201).end();
                        });
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


        detach: function(request, response){

        },

        moveLayer: function(request, response){

        }
    });
