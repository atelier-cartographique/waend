/*
 * lib/queue.js
 *     
 * 
 * Copyright (C) 2014  Pierre Marchand <pierremarc07@gmail.com>
 * 
 * License in LICENSE file at the root of the repository.
 *
 */

var _ = require('underscore');


var channels = {};


function createChannel(chan){
    channels[chan] = [];
};

function listenChannel(chan, cb, ctx){
    channels[chan].push(_.bind(cb, ctx));
};

module.exports.SUB = function(channel, callback, ctx){
    
    if(!(channel in channels)){
        createChannel(channel);
    }

    listenChannel(channel, callback, ctx);

}; 

module.exports.PUB = function(channel, data, uid){
    _.each(channels[channel], function(f){
        try{
            f(data, uid);
        }
        catch(e){
            console.error('Queue.PUB', channel, e);
        }
    });
}; 