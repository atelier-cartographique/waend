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
    attach = require('./commands/layer/attach'),
    listFeatures = require('./commands/layer/listFeatures'),
    drawLine = require('./commands/layer/drawLine');



var Layer = Context.extend({
    name: 'group',
    commands:{
        'attach': attach.command,
        'lf': listFeatures.command,
        'draw': drawLine.command
    }
});


module.exports = exports = Layer;
