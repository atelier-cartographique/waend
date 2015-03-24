/*
 * app/src/Renderer.js
 *     
 * 
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 * 
 * License in LICENSE file at the root of the repository.
 *
 */

'use strict';


var _ = require('underscore'),
    util = require("util"),
    ol = require('openlayers'),
    Geometry = require('../lib/Geometry'),
    semaphore = require('../lib/Semaphore');


function CanvasRenderer () {
    ol.renderer.canvas.Map.apply(this, arguments);
};

function WebGLRenderer () {
    ol.renderer.webgl.Map.apply(this, arguments);
};

util.inherits(CanvasRenderer, ol.renderer.canvas.Map);
util.inherits(WebGLRenderer, ol.renderer.webgl.Map);


module.exports = exports = CanvasRenderer;
// module.exports = exports = WebGLRenderer;

