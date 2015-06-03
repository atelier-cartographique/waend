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
    Bind = require('./Bind'),
    getGeometry = require('./commands/feature/getGeometry'),
    setGeometry = require('./commands/feature/setGeometry');



var Feature = Context.extend({
    name: 'group',
    commands:{
        'gg' : getGeometry.command,
        'sg' : setGeometry.command
    }
});


module.exports = exports = Feature;
