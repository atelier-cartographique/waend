/*
 * app/lib/Feature.js
 *     
 * 
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 * 
 * License in LICENSE file at the root of the repository.
 *
 */

'use strict';

var Context = require('./Context'),
    Bind = require('./Bind');



var Feature = Context.extend({
    name: 'group',
    commands:{}
});


module.exports = exports = Feature;