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
    O = require('../../lib/object').Object,
    ol = require('openlayers');

var Geometry = ol.geom.Geometry,
    Polygon = ol.geom.Polygon,
    format = ol.format,
    supportedFormatNames = [
    "GeoJSON", 
    "GPX", 
    "KML", 
    "OSMXML", 
    "Polyline", 
    "TopoJSON",
    "WKT", 
    "GML2", "GML3", "GML"
    ],
    supportedFormat = {};

_.each(supportedFormatNames, function(name){
    supportedFormat[name] = new (ol.format[name])();
});

function Extent ( extent ) { // whether from an OL extent or an Extent
    if (extent instanceof Extent){
        this.extent = JSON.parse(JSON.stringify(extent.extent));
    }
    else {
        this.extent = JSON.parse(JSON.stringify(extent));
    }
     console.log('Extent.extent', typeof this.extent);
};

Extent.prototype.clone = function () {
    return (new Extent(this));
};

Extent.prototype.toPolygon = function () {
    var coords = [[
        this.getTopLeft().getCoordinates(), 
        this.getTopRight().getCoordinates(),
        this.getBottomRight().getCoordinates(),
        this.getBottomLeft().getCoordinates(),
        this.getTopLeft().getCoordinates()
    ]];
    return (new Polygon(coords));
};

Extent.prototype.toString = function (opt_format) {
    opt_format = opt_format || 'WKT';
    var format = supportedFormat[opt_format],
        str = format.writeGeometry(this.toPolygon());
    return str;
};

var extentMethods = [
    'buffer',
    'containsCoordinate',
    'containsXY',
    'getHeight',
    'getWidth',
    'isEmpty'
];

var extentExtentMethods = [
    'containsExtent',
    'equals',
    'extend',
    'intersects',
];

var extentPointMethods = [
    'getBottomLeft',
    'getBottomRight',
    'getCenter',
    'getTopLeft',
    'getTopRight'
    ];


_.each(extentMethods, function(methodName) {
    Extent.prototype[methodName] = function () {
        var args = _.toArray(arguments).slice(1);
        return ol.extent[methodName].apply(ol.extent, [this.extent].concat(args));
    };
});

_.each(extentExtentMethods, function(methodName) {
    Extent.prototype[methodName] = function () {
        var args = _.toArray(arguments).slice(1),
            ext2 = new Extent(args.shift());
        return ol.extent[methodName].apply(ol.extent, [this.extent, ext2.extent].concat(args));
    };
});

_.each(extentPointMethods, function(methodName) {
    Extent.prototype[methodName] = function () {
        var args = _.toArray(arguments).slice(1);
        var coords = ol.extent[methodName].apply(ol.extent, [this.extent].concat(args));
        return (new ol.geom.Point(coords));
    };
});



var Region = O.extend({
    initialize: function () {
        this.state = [];
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
        this.emit('change', extent, this);
    },

    pushExtent: function (extent) {
        this.state.push(extent);
        return this.emitChange(extent);
    },

    push: function (geom, opt_format) {
        if (!opt_format && (geom instanceof Extent)) {
            var extent = geom.clone();
            return this.pushExtent(extent);
        }        
        else if (!opt_format && (geom instanceof Geometry)) {
            var extent = new Extent(geom.getExtent());
            return this.pushExtent(extent);
        }        
        else if (!opt_format && (geom instanceof Array)) { // we assume ol.extent type
            var extent = new Extent(geom);
            return this.pushExtent(extent);
        }
        else if (!!opt_format){
            if (opt_format in supportedFormat) {
                var gg = supportedFormat[opt_format].readGeometry(geom);
                var extent = new Extent(gg.getExtent());
                return this.pushExtent(extent);
            }
            throw (new Error('region.push format not supported: '+ opt_format));
        }
        throw (new Error('region.push invalid geometry'))
    },

});

var region = new Region();

module.exports = exports = region;

