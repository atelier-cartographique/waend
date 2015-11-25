
/*
 * lib/token.js
 *
 *
 * Copyright (C) 2014  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */

var _ = require('underscore'),
    uuid = require('node-uuid');

var defaultExpire = 1000 * 60,
    tokens = [],
    intervalId;

function Token (user) {

    Object.defineProperty(this, 'token', {
        value: uuid.v4()
    });
    Object.defineProperty(this, 'user', {
        value: user
    });
    Object.defineProperty(this, 'ts', {
        value: Date.now()
    });

}

Token.prototype.toJSON = function () {
    return {
        user: this.user.id,
        token: this.token
    };
};

function vacuumFn () {
    var newTks = [],
        limit = Date.now() - defaultExpire;
    for (var i = 0; i < tokens.length; i++) {
        if (tokens[i].ts < limit) {
            newTks.push(tokens[i]);
        }
    }
    if (tokens.length !== newTks.length) {
        tokens = newTks;
    }
}

function startVacuumTask () {
    if (intervalId) {
        return;
    }
    intervalId = setInterval(vacuumFn, 1000);
}

// function stopVacuumTask () {
//     if (intervalId && (0 === tokens.length)) {
//         clearInterval(intervalId);
//         intervalId = null;
//     }
// }

startVacuumTask();

module.exports.put = function(user){
    var t = new Token(user);
    tokens.push(t);
    return t;
};

module.exports.get = function(tok){
    for (var i = 0; i < tokens.length; i++) {
        if (tok === tokens[i].token) {
            return tokens[i].user;
        }
    }
    return null;
};
