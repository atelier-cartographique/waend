/*
 * app/lib/Region.js
 *     
 * 
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 * 
 * License in LICENSE file at the root of the repository.
 *
 */

'use strict';


var _ = require('underscore'),
    semaphore = require('../lib/Semaphore'),
    Geometry = require('./Geometry'),
    O = require('../../lib/object').Object;

var WORLD_EXTENT = new Geometry.Extent([-180, -90 ,180, 90]);

var Region = O.extend({
    initialize: function () {
        this.state = [WORLD_EXTENT.clone()];
        semaphore.on('region:push', this.push, this);
    },

    getWorldExtent: function () {
        return WORLD_EXTENT.clone();
    },

    get: function () {
        return _.last(this.state).clone();
    },

    pop: function () {
        var extent = this.state.pop();
        this.emitChange(this.get());
        return this.get();
    },

    emitChange: function (extent) {
        semaphore.signal('region:change', extent, this);
    },

    pushExtent: function (extent) {
        this.state.push(extent);
        return this.emitChange(extent);
    },

    push: function (geom, opt_format) {
        if (!opt_format && (geom instanceof Geometry.Extent)) {
            var extent = geom.clone();
            return this.pushExtent(extent);
        }        
        else if (!opt_format && (geom instanceof Geometry.Geometry)) {
            var extent = new Geometry.Extent(geom.getExtent());
            return this.pushExtent(extent);
        }        
        else if (!opt_format && _.isArray(geom)) { // we assume ol.extent type
            var extent = new Geometry.Extent(geom);
            return this.pushExtent(extent);
        }
        else if (!!opt_format){
            if (opt_format in Geometry.format) {
                var gg = Geometry.format[opt_format].read(geom);
                var extent = new Geometry.Extent(gg.getExtent());
                return this.pushExtent(extent);
            }
            throw (new Error('region.push format not supported: '+ opt_format));
        }
        throw (new Error('region.push invalid geometry'))
    },

});

var region = new Region();

module.exports = exports = region;

