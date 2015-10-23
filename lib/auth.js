/*
 * lib/auth.js
 *
 *
 * Copyright (C) 2014  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */


var _ = require('underscore'),
    Promise = require("bluebird"),
    bcrypt = require('bcrypt'),
    uuid = require('node-uuid'),
    db = require('./db'), // auth is not cached
    cache = require('./cache');

'use strict';
Promise.longStackTraces();

var bcryptGenSalt = Promise.promisify(bcrypt.genSalt);
var bcryptHash = Promise.promisify(bcrypt.hash);
var bcryptCompare = Promise.promisify(bcrypt.compare);

function AuthError () {
    if(arguments.length > 0){
        console.error.apply(console, arguments);
    }
}
AuthError.prototype = Object.create(Error.prototype);



function getAuthenicatedUser (authId) {
    return cache.client().getAuthenticatedUser(authId);
}


function comparePassword (password, authRow) {
    // fields = ['id', 'email', 'hash'];
    if(authRow.length > 0){
        var hash = authRow[0].password,
            id = authRow[0].id;

        // var next = _.partial(getAuthenicatedUser, id);
        // console.log('auth.comparePassword |'+password+ '|'+hash+'|');
        return bcryptCompare(password, hash)
            .then(function(result){
                if(!result){
                    return Promise.reject('wrong password');
                }
                return getAuthenicatedUser(id);
            });
    }
    return Promise.reject(new AuthError('not a registered user'));
}

module.exports.verify = function (email, password, done) {

    var resolve = function (result) {
        console.log('auth.verify.resolve', result);
        if(result){
            return done(null, result);
        }
        return  done(new AuthError('wrong credentials'), null);
    };

    var reject = function (err) {
        return done(new AuthError(err), null);
    };

    var seededComparePassword = _.partial(comparePassword, password);

    db.client()
        .query('authGetEmail', [email])
        .then(seededComparePassword)
        .then(resolve)
        .catch(reject);
};


// function createUserMap (user) {
//     var group = {
//         user_id: user.id,
//         status_flag: 2,
//         properties: {
//             name: 'workspace',
//         }
//     };
//     return cache.client().set('group', group);
// };

function createUser (name, auth_row) {
    var auth_id = auth_row[0].id,
        user = {
        auth_id: auth_id,
        properties: {
            name: name
        }
    };
    return cache.client().set('user', user);
}


function createAuth (email, hash) {
console.log('auth.createAuth', email, hash);
    return db.client()
        .query('authCreate', [uuid.v4(), email, hash]);
}

module.exports.register = function (email, password, name) {
    var seededCreateAuth = _.partial(createAuth, email),
        seededCreateUser = _.partial(createUser, name),
        fnHash = _.partial(bcryptHash, password);
console.log('auth.register', email, password);
    return bcryptGenSalt(12)
            .then(fnHash)
            .then(seededCreateAuth)
            .then(seededCreateUser);
};
