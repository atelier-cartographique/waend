/*
 * lib/notifier.js
 *
 *
 * Copyright (C) 2014  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */


var logger = require('debug')('lib/notifier'),
    _ = require('underscore'),
    sockjs = require('sockjs'),
    Token = require('./token');

function authUser (state, uid, tok) {
    state.user = Token.get(tok);
}

function subscribe(state, type, id) {
    if (!(type in state.channels)) {
        state.channels[type] = [];
    }
    state.channels[type].push(id);
    state.channels[type] = _.uniq(state.channels[type]);
}


var handlers = {
    'auth': authUser,
    'sub': subscribe
};

function Channel (type, id) {
    Object.defineProperty(this, 'type', {
        value: type
    });
    Object.defineProperty(this, 'id', {
        value: id
    });
    // Object.freeze(this);
}


Channel.prototype.getPack = function () {
    return {
        type: this.type,
        id: this.id
    };
};

module.exports.Channel = Channel;

/////////////////
// few helpers //
/////////////////


module.exports.update = function (chanType, chanId, data) {
    var chan = new Channel(chanType, chanId);
    exports.sendChannel(chan, 'update', data);
};

module.exports.create = function (chanType, chanId, data) {
    var chan = new Channel(chanType, chanId);
    exports.sendChannel(chan, 'create', data);
};

module.exports.delete = function (chanType, chanId, id) {
    var chan = new Channel(chanType, chanId);
    exports.sendChannel(chan, 'delete', id);
};



function State (sock, done) {
    this.id = _.uniqueId();
    this.sock = sock;
    this.user = null;
    this.channels = {};
    this.ready = false;
    this.done = done;
}

State.prototype.dispatch = function () {
    var name = arguments[0],
        args = [this];

    if (name in handlers) {
        for (var i = 1; i < arguments.length; i++) {
            args.push(arguments[i]);
        }
        handlers[name].apply(this, args);
    }
};

State.prototype.init = function () {
    var that = this,
        sock = that.sock;

    sock.on('close', function() {
        that.done(that);
    });

    sock.on('data', function(message) {
        var data;
        try{
            data = JSON.parse(message);
        }
        catch(e){
            sock.close(400, 'Expect well formed JSON data string');
            that.done();
            return;
        }

        that.dispatch.apply(that, data);
    });
};


function StateVec () {
    this.states = [];
    this.freeIndex = [];
}

StateVec.prototype.eachChannel = function (chan, fn, ctx) {
    var states = this.states;
    for (var i = 0; i < states.length; i++) {
        if (states[i]) {
            var state = states[i],
                channels = state.channels;
            if (chan.type in channels) {
                if (_.indexOf(channels[chan.type], chan.id) >= 0) {
                    // logger('Notifier.channel', state.id, chan.type, chan.id);
                    fn.call(ctx, state);
                }
            }
        }
    }
};

StateVec.prototype.eachUser = function (uid, fn, ctx) {
    var states = this.states;
    for (var i = 0; i < states.length; i++) {
        if (states[i]) {
            var state = states[i],
                id = state.user ? state.user.id : null;
            if (uid === id) {
                fn.call(ctx, state);
            }
        }
    }
};

StateVec.prototype.each = function (fn, ctx) {
    var states = this.states;
    for (var i = 0; i < states.length; i++) {
        if (states[i]) {
            var state = states[i];
            fn.call(ctx, state);
        }
    }
};


StateVec.prototype.removeState = function (state) {
    var id = state.id,
        states = this.states,
        idx = _.findIndex(states, function(s){
            if (s) {
                return s.id === id;
            }
        });
    states[idx] = null;
    this.freeIndex.push(idx);
};

StateVec.prototype.create = function (sock) {
    var state = new State(sock, this.removeState.bind(this));
    if (this.freeIndex.length > 0) {
        var idx = this.freeIndex.pop();
        this.states[idx] = state;
    }
    else {
        this.states.push(state);
    }
    state.init();
    return state;
};






var notifyServer,
    states;

module.exports.configure = function(server, prefix){
    if (notifyServer) {
        throw (new Error('Notify Server already in use'));
    }

    notifyServer = sockjs.createServer();
    states = new StateVec();
    notifyServer.on('connection', function(sock){
        states.create(sock);
    });

    notifyServer.installHandlers(server, {prefix: prefix});
};

function checkNotifier () {
    if (!notifyServer || !states) {
        throw (new Error('Called Notify Server when not configured'));
    }
}

// module.exports.broadcast = function (data){
//     checkNotifier();
//     var chan = new Channel('*', '*'),
//         msg = JSON.stringify([chan.getPack(), data]);
//
//     function notify (state) {
//         state.sock.write(msg);
//     }
//
//     states.each(notify);
// };

module.exports.sendChannel = function (/* channel, ... */){
    checkNotifier();
    var chan = arguments[0],
        args = [chan.getPack()];
    for (var i = 1; i < arguments.length; i++) {
        args.push(arguments[i]);
    }

    var msg = JSON.stringify(args);

    function notify (state) {
        state.sock.write(msg);
    }

    states.eachChannel(chan, notify);
};
