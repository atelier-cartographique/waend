/*
 * routes/endpoints/base.js
 *
 *
 * Copyright (C) 2014  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */


var logger = require('debug')('routes/endpoint/base'),
    _ = require('underscore'),
    Promise = require('bluebird');

var store = require('../../lib/cache'),
    object = require('../../lib/object'),
    cache = require('../../lib/cache');


var PAGE_SIZE = 64;
var DEFAULT_PAGE = 0;


module.exports.RequestHandler = object.Object.extend({

    isAuthenticated: function (request, response, next) {
        if(request.user){
            return next();
        }
        response.status(401).send('NOT AUTHENTICATED');
    },

    isUser: function (request, response, next) {
        var userId = request.params.user_id;
        if(request.user.id === userId){
            return next();
        }
        response.status(403).send('NOT THE RIGHT USER');
    },

    isGroupOwner: function (request, response, next) {
        var groupId = request.params.group_id,
            requestUserId = request.user.id;

        cache.client().get('group', groupId)
            .then(function(group){
                if(requestUserId === group.user_id){
                    return next();
                }
                response.status(403).send('NOT THE GROUP OWNER');
            })
            .catch(function(err){
                response.status(404).send(err.toString());
            });
    },

    isLayerOwner: function (request, response, next) {
        var layerId = request.params.layer_id,
            requestUserId = request.user.id;

        cache.client().get('layer', layerId)
            .then(function(layer){
                if(requestUserId === layer.user_id){
                    return next();
                }
                response.status(403).send('NOT THE LAYER OWNER');
            })
            .catch(function(err){
                response.status(404).send(err.toString());
            });
    },

    ownsGroupOrPublic: function (request, response, next) {
        var groupId = request.params.group_id,
            requestUserId = (request.user) ? request.user.id : 'x';
        cache.client().get('group', groupId)
            .then(function(group){
                if((0 === group.status_flag)
                    || (requestUserId === group.user_id)){
                    return next();
                }
                response.status(403).send('NOT THE GROUP OWNER NOR A PUBLIC GROUP');
            })
            .catch(function(err){
                console.error('base.ownsGroupOrPublic err', err);
                response.status(404).send(err.toString());
            });
    },



    paginate: function (result, request, response) {
        var page = parseInt(request.query.page) || DEFAULT_PAGE,
            pageSize = parseInt(request.query.page_size) || PAGE_SIZE,
            offset = pageSize * page,
            len = result.length,
            pResult = result.slice(offset, offset + pageSize);

        // logger('base.paginate', offset, offset + page);
        // logger(pResult);

        response.status(200).send({
            page: page,
            totalCount: len,
            pageSize: pageSize,
            pageCount: Math.ceil(len / pageSize),
            results: pResult
        });
    },


    getEndpoints: function(){
        return _.result(this, 'endpoints');
    }

});
