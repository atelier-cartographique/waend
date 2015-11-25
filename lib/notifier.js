/*
 * routes/notifier.js
 *
 *
 * Copyright (C) 2014  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */


var _ = require('underscore'),
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


module.exports.Channel = Channel;

module.exports.update = function (type, id, data) {
    var chan = new Channel('group', id);
    exports.sendChannel(chan, ['update', data]);
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
        var state = states[i],
            channels = state.channels;
        if (chan.type in channels) {
            if (_.indexOf(channels[chan.type], chan.id) >= 0) {
                fn.call(ctx, state);
            }
        }
    }
};

StateVec.prototype.eachUser = function (uid, fn, ctx) {
    var states = this.states;
    for (var i = 0; i < states.length; i++) {
        var state = states[i],
            id = state.user ? state.user.id : null;
        if (uid === id) {
            fn.call(ctx, state);
        }
    }
};

StateVec.prototype.each = function (fn, ctx) {
    var states = this.states;
    for (var i = 0; i < states.length; i++) {
        var state = states[i];
        fn.call(ctx, state);
    }
};


StateVec.prototype.removeState = function (state) {
    var id = state.id,
        states = this.states,
        idx = _.findIndex(states, function(s){
            return s.id === id;
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
    this.states.push(state);
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

module.exports.broadcast = function (data){
    checkNotifier();
    var msg = JSON.stringify(data);

    function notify (state) {
        state.sock.write(msg);
    }

    states.each(notify);
};

module.exports.sendChannel = function (channel, data){
    checkNotifier();
    var msg = JSON.stringify(data);

    function notify (state) {
        state.sock.write(msg);
    }

    states.eachChannel(channel, notify);
};

module.exports.sendUser = function (userid, data){
    checkNotifier();
    var msg = JSON.stringify(data);

    function notify (state) {
        state.sock.write(msg);
    }

    states.eachUser(userid, notify);
};
