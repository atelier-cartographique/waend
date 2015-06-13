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
    listFeatures = require('./commands/layer/listFeatures'),
    createFeature = require('./commands/layer/createFeature'),
    importer = require('./commands/layer/importer');



var Layer = Context.extend({
    name: 'group',
    commands:{
        'lf': listFeatures.command,
        'create': createFeature.command,
        'import': importer.command
    }
});


module.exports = exports = Layer;
