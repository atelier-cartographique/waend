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
    util = require("util"),
    ol = require('openlayers');

var Geometry = ol.geom.Geometry,
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


function Point () {
    ol.geom.Point.apply(this, arguments);
}
util.inherits(Point, ol.geom.Point);

function LineString () {
    ol.geom.LineString.apply(this, arguments);
}
util.inherits(LineString, ol.geom.LineString);

function Polygon () {
    ol.geom.Polygon.apply(this, arguments);
}
util.inherits(Polygon, ol.geom.Polygon);


_.each(supportedFormatNames, function(name){
    var f = new (ol.format[name])();
    if(f.writeGeometry
        && f.readGeometry){
        supportedFormat[name] = _.extend(f,{
            read: function () {
                var geom = this.readGeometry.apply(this, arguments),
                    geomType = geom.getType();
                if ('Point' === geomType) {
                    return (new Point(geom.getCoordinates()));
                }
                if ('LineString' === geomType) {
                    return (new LineString(geom.getCoordinates()));
                }
                if ('Polygon' === geomType) {
                    return (new Polygon(geom.getCoordinates()));
                }
                throw (new Error('Unsupported Geometry Type ' + geomType));
            },

            write: function () {
                return this.writeGeometry.apply(this, arguments);
            }
        });
    }
});


function formatGeometry (opt_format) {
    opt_format = opt_format || 'GeoJSON';
    var format = supportedFormat[opt_format],
        str = format.write(this);
    return str;
};

function toGeoJSON () {
    var gjStr = formatGeometry.call(this);
    return JSON.parse(gjStr);
};

Point.prototype.format = formatGeometry;
LineString.prototype.format = formatGeometry;
Polygon.prototype.format = formatGeometry;

Point.prototype.toString = formatGeometry;
LineString.prototype.toString = formatGeometry;
Polygon.prototype.toString = formatGeometry;

Point.prototype.toGeoJSON = toGeoJSON;
LineString.prototype.toGeoJSON = toGeoJSON;
Polygon.prototype.toGeoJSON = toGeoJSON;


function Extent ( extent ) { // whether from an OL extent or an Extent
    if (extent instanceof Extent){
        this.extent = JSON.parse(JSON.stringify(extent.extent));
    }
    else {
        this.extent = JSON.parse(JSON.stringify(extent));
    }
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
    return this.toPolygon().format(opt_format);
};

Extent.prototype.toBounds = function () {
    var sw = this.getBottomLeft().getCoordinates(),
        ne = this.getTopRight().getCoordinates(),
        // width = this.getWidth(),
        // height = this.getHeight(),
        bounds = {'w':sw[0], 's':sw[1], 'e':ne[0], 'n':ne[1]};

    return bounds;
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
        var args = _.toArray(arguments);
        return ol.extent[methodName].apply(ol.extent, [this.extent].concat(args));
    };
});

_.each(extentExtentMethods, function(methodName) {
    Extent.prototype[methodName] = function () {
        var args = _.toArray(arguments),
            ext2 = new Extent(args.shift());
        return ol.extent[methodName].apply(ol.extent, [this.extent, ext2.extent].concat(args));
    };
});

_.each(extentPointMethods, function(methodName) {
    Extent.prototype[methodName] = function () {
        var args = _.toArray(arguments);
        var coords = ol.extent[methodName].apply(ol.extent, [this.extent].concat(args));
        return (new Point(coords));
    };
});

module.exports.Geometry = Geometry;
module.exports.Extent = Extent;
module.exports.Point = Point;
module.exports.LineString = LineString;
module.exports.Polygon = Polygon;
module.exports.format = supportedFormat;
