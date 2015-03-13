/*
 * app/lib/User.js
 *     
 * 
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 * 
 * License in LICENSE file at the root of the repository.
 *
 */

'use strict';

var Context = require('./Context'),
    Bind = require('./Bind'),
    listGroups = require('./commands/user/listGroups');


var User = Context.extend({
    name: 'user',
    commands:{
        'lg': listGroups.command
    }
});


module.exports = exports = User;
