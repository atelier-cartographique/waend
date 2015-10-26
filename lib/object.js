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
    util = require('util'),
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
    child.prototype = new Surrogate();

    if (protoProps) {
        _.extend(child.prototype, protoProps);
    }

    child.__super__ = parent.prototype;
    child.extend = parent.extend;

    return child;
}

/*
 * Evented object
 *
 */

function EventedObject(){
    this._handlers = {};
    this.initialize.apply(this, arguments);
}

util.inherits(EventedObject, EventEmitter);

EventedObject.prototype.initialize = function () {};

EventedObject.prototype.on = function (event, cb, ctx) {
    var wrapped;
    if (cb.listener) { // it comes from EventEmitter.once, so already wrapped
        wrapped = cb;
    }
    else {
        wrapped = function () {
            return cb.apply(ctx || this, arguments);
        };
    }
    var eventList = event.split(' ');
    var handlerId = [];
    for (var i = 0; i < eventList.length; i++) {
        var e = eventList[i];
        if (e) {
            handlerId.push(_.uniqueId('ON_'));
            EventEmitter.prototype.on.apply(this, [e, wrapped]);
            this._handlers[handlerId] = {
                'event': event,
                'callback': wrapped
            };
        }
    }
    return handlerId;
};

EventedObject.prototype.offById = function (ids) {
    if (!_.isArray(ids)) {
        ids = [ids];
    }
    for (var i = 0; i < ids.length; i++) {
        var id = ids[i];
        if (id in this._handlers) {
            var e = this._handlers[id].event,
                cb = this._handlers[id].callback;
            EventEmitter.prototype.removeListener.apply(this, [e, cb]);
            delete this._handlers[id];
        }
    }
};


EventedObject.prototype.once = function (event, cb, ctx) {
    var wrapped = function () {
        return cb.apply(ctx || this, arguments);
    };
    var eventList = event.split(' ');
    // var handlerId = [];
    for (var i = 0; i < eventList.length; i++) {
        var e = eventList[i];
        if (e) {
            console.log('EventedObject.prototype.once', e);
            EventEmitter.prototype.once.apply(this, [e, wrapped]);
        }
    }
};

/**
 *
 *
 */
EventedObject.prototype.tryMethod = function(){
    var args = _.toArray(arguments);
    var methodName = args.shift();
    var defaultReturn = args.shift();
    if(methodName in this){
        return this[methodName].apply(this, args);
    }
    return defaultReturn;
};

EventedObject.prototype.argumentsToArray = function () {
    var l = arguments.length, a = new Array(l);
    for (var i = 0; i < l; i++) {
        a[i] = arguments[i];
    }
    return a;
};

EventedObject.extend = extend;

module.exports.Object = EventedObject;
