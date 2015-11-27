/*
 * lib/store.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */


var Promise = require('bluebird'),
    redisCb = require('redis');

var redis = Promise.promisifyAll(redisCb);

var redisClient;
module.exports.configure = function(config){
    if(redisClient){
        return;
    }
    redisClient = redis.createClient(config.redis.port, config.redis.host);
};


module.exports.client = function(){
    if(!redisClient){
        throw (new Error('Store not configured'));
    }
    return redisClient;
};
