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
    redisCb = require('redis'),
    level = require('level');

var redis = Promise.promisifyAll(redisCb);

function MemoryClient () {
    this.data = {};
}

MemoryClient.prototype.put = function (key, value) {
    this.data[key] = value;
    return Promise.resolve(key);
};

MemoryClient.prototype.get = function (key) {
    if (key in this.data) {
        return Promise.resolve(this.data[key]);
    }
    return Promise.reject(key);
};

MemoryClient.prototype.del = function (key) {
    delete this.data[key];
    return Promise.resolve(key);
};


function RedisClient (redisConnection) {
    this.redis = redisConnection;
}

RedisClient.prototype.put = function (key, value) {
    return this.redis.setAsync(key, value);
};

RedisClient.prototype.get = function (key) {
    return this.redis.getAsync(key);
};

RedisClient.prototype.del = function (key) {
    return Promise.reject('NotImplemented');
};


function LevelClient (levelConnection) {
    this.level = levelConnection;
}

LevelClient.prototype.put = function (key, value) {
    var db = this.level;
    return new Promise(function(resolve, reject){
        db.put(key, value, function(err){
            if (err) return reject(err);
            resolve(key);
        });
    });
};

LevelClient.prototype.get = function (key) {
    var db = this.level;
    return new Promise(function(resolve, reject){
        db.get(key, function(err, value){
            if (err) return reject(err);
            resolve(value);
        });
    });
};

LevelClient.prototype.del = function (key) {
    return Promise.reject('NotImplemented');
};

var theClient;

module.exports.configure = function(config){
    if(theClient){
        return;
    }

    if ('level' in config) {
        theClient = new LevelClient(level(config.level.path));
    }
    else if ('redis' in config) {
        theClient = new RedisClient(
            redis.createClient(config.redis.port, config.redis.host)
        );
    }
    else {
        console.warn('Using a memeory cache store,\nmay not be suitable for production use');
        theClient = new MemoryClient();
    }
};


module.exports.client = function(){
    if(!theClient){
        throw (new Error('Store not configured'));
    }
    return theClient;
};
