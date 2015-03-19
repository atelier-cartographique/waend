/*
 * app/src/Map.js
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
    region = require('../lib/Region'),
    Geometry = require('../lib/Geometry'),
    Source = require('./Source');


function Map () {
    ol.Map.apply(this, arguments);
};

util.inherits(Map, ol.Map);

Map.prototype.updateRegion = function() {

};



module.exports.Map = Map;

