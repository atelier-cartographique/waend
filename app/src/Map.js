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
    ol = require('openlayers'),
    Geometry = require('../lib/Geometry'),
    semaphore = require('../lib/Semaphore'),
    Renderer = require('./Renderer');


function Map () {
    ol.Map.apply(this, arguments);
    this.renderer_ = new Renderer(this.viewport_, this);

    // monitor viewport change in order to forward to the region
    var view = this.getView();
    view.on('change:center', this.updateRegion, this);
    view.on('change:resolution', this.updateRegion, this);
    view.on('change:rotation', this.updateRegion, this);

    // listen to layer setup changes

};

ol.inherits(Map, ol.Map);

Map.prototype.updateRegion = function() {
    var view = this.getView(),
        extent = view.calculateExtent(this.getSize());
    semaphore.signal('region:push', extent);
};



module.exports = exports = Map;

