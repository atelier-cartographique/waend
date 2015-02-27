
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


var tokens = {};




module.exports.PUT = function(user){
    var t = uuid.v4();
    tokens[t] = user;
    return t;
}; 

module.exports.GET = function(tok){
    var user = tokens[tok];
    return user;
}; 