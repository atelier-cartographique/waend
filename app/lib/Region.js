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
    Projection = require('proj4'),
    O = require('../../lib/object').Object;


function fequals (a, b, p) {
    return (Math.abs(a - b) < p);
}

function maxVert () {
    var Proj3857 = Projection('EPSG:3857');
    var pt = [0, 0], r, ir;
    var INC = 0.1;

    var ret = 90;
    for (var i = 80; i < 90; i += INC) {
        pt = [180, i];
        r = Proj3857.forward(pt);
        ir = Proj3857.inverse(r);
        if (!fequals(ir[1], pt[1], INC)) {
            ret = i - INC;
            break;
        }
    }
    return ret
}

var horizMax = 180,
    vertiMax = maxVert();

var WORLD_EXTENT = new Geometry.Extent([-horizMax, -vertiMax, horizMax, vertiMax]);

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
        this.state.push(extent.normalize());
        return this.emitChange(extent);
    },

    push: function (geom) {
        var extent;
        if (geom instanceof Geometry.Extent) {
            extent = geom.clone();
        }
        else if (geom instanceof Geometry.Geometry) {
            extent = geom.getExtent();
        }
        else if (_.isArray(geom)) { // we assume ol.extent type
            extent = new Geometry.Extent(geom);
        }
        else{
            extent = (new Geometry(geom)).getExtent();
        }
        return this.pushExtent(extent);
    },

});

var region = new Region();

module.exports = exports = region;
