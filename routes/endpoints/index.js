/*
 * routes/endpoints/index.js
 *     
 * 
 * Copyright (C) 2014  Pierre Marchand <pierremarc07@gmail.com>
 * 
 * License in LICENSE file at the root of the repository.
 *
 */

 var _ = require('underscore');

var handlers = []; 

var modelNames = ['user', 'layer', 'entity', 'group'];
var modelNames = ['user', 'group', 'layer'];

 _.each(modelNames, function(modelName){
    var RH = require('./'+modelName);
    var handler = new RH;
    handlers.push(handler);
 });


 module.exports = exports = handlers;
