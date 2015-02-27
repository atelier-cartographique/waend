/*
 * lib/object.js
 *     
 * 
 * Copyright (C) 2014  Pierre Marchand <pierremarc07@gmail.com>
 * 
 * License in LICENSE file at the root of the repository.
 *
 */



var _ = require('underscore'),
    util = require("util"),
    EventEmitter = require('events').EventEmitter;

// from backbone
function extend(protoProps) { 
    var parent = this;
    var child;
    if (protoProps && _.has(protoProps, 'constructor')) {
        child = protoProps.constructor;
    } else {
        child = function () {
            return parent.apply(this, arguments);
        };
    }

    var Surrogate = function () {
        this.constructor = child;
    };
    Surrogate.prototype = parent.prototype;
    child.prototype = new Surrogate;

    if (protoProps) _.extend(child.prototype, protoProps);

    child.__super__ = parent.prototype;
    child.extend = parent.extend;

    return child;
};

/*
 * Evented object
 * 
 */

function EventedObject(){
    this.initialize.apply(this, arguments);
};

util.inherits(EventedObject, EventEmitter);
EventedObject.prototype.initialize = function () { };

/**
 * 
 *
 */
EventedObject.prototype.tryMethod = function(){
    var args =  _.toArray(arguments);
    var methodName = args.shift();
    var defaultReturn = args.shift();
    if(methodName in this){
        return this[methodName].apply(this, args);
    }
    return defaultReturn;
};

EventedObject.extend = extend;

module.exports.Object = EventedObject;
