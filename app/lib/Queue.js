/*
 * app/lib/Queue.js
 *     
 * 
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 * 
 * License in LICENSE file at the root of the repository.
 *
 */

'use strict';


var _ = require('underscore'),
    Promise = require('bluebird'),
    O = require('../../lib/object').Object;


var QueueOptions = ['timeout', 'maxLength'];

var Queue = O.extend({
    timeout: 1000,
    maxLength: 1000,

    initialize: function (options) {
        _.extend(this, _.pick(options, QueueOptions) || {});

        this.current = undefined;
    },

    push: function (fn, ctx, args) {
        var self = this;
        if (self.current){
            var current = self.current;
            current
                .then(function(){

                })
                .catch(function(err){

                })
                .finally(function(){
                    console.log('Queue', fn.name, args);
                    self.current = Promise.resolve(fn.apply(ctx, args));
                });
        }
        else{
            self.current = Promise.resolve(fn.apply(ctx, args));
        }

        return this;
    },

});

module.exports = exports = Queue;
