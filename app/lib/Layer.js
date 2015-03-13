/*
 * app/lib/Layer.js
 *     
 * 
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 * 
 * License in LICENSE file at the root of the repository.
 *
 */

'use strict';

var Context = require('./Context'),
    attach = require('./commands/layer/attach');



var Layer = Context.extend({
    name: 'group',
    commands:{
        attach: attach.command
    }
});


module.exports = exports = Layer;
