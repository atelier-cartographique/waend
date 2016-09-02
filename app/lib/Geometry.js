/*
 * app/lib/Geometry.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */

'use strict';


var _ = require('underscore'),
    util = require('util'),
    turf = require('turf');


function copy (data) {
    return JSON.parse(JSON.stringify(data));
}

function Geometry (data) {
    if (data instanceof Geometry) {
        this._geometry = copy(data._geometry);
    }
    else if ('geometry' in data) { // a feature dict
        this._geometry = copy(data.geometry);
    }
    else if ('type' in data) { // a geometry
        this._geometry = copy(data);
    }
    else {
        throw (new Error('CanNotBuildGeometry'));
    }
}

Geometry.prototype.clone = function () {
    return (new Geometry(this));
};

Geometry.prototype.getType = function () {
    return this._geometry.type;
};

Geometry.prototype.getCoordinates = function () {
    return copy(this._geometry.coordinates);
};

Geometry.prototype.getExtent = function () {
    return (new Extent(turf.bbox(this._geometry)));
};

Geometry.prototype.toGeoJSON = function () {
    return copy(this._geometry);
};


function Point () {
    var data = arguments[0];
    if (_.isArray(data)) {
        data = turf.point(data);
    }
    Geometry.call(this, data);
}
util.inherits(Point, Geometry);


function LineString () {
    var data = arguments[0];
    if (_.isArray(data)) {
        data = turf.linestring(data);
    }
    Geometry.call(this, data);
}
util.inherits(LineString, Geometry);

LineString.prototype.appendCoordinate = function (opt_point) {
    var p = new Point(opt_point);
    this._geometry.coordinates.push(p.getCoordinates());
};


function Polygon () {
    var data = arguments[0];
    if (_.isArray(data)) {
        data = turf.polygon(data);
    }
    Geometry.call(this, data);
}
util.inherits(Polygon, Geometry);



function Extent ( extent ) { // whether from an [minx, miny, maxx, maxy] extent or an Extent
    if (extent instanceof Extent){
        this.extent = extent.getArray();
    }
    else if (extent instanceof Geometry) {
        this.extent = extent.getExtent().getArray();
    }
    else if (('top' in extent)
             && ('left' in extent)
             && ('right' in extent)
             && ('bottom' in extent)) {
        this.extent = [
            extent.left,
            extent.top,
            extent.right,
            extent.bottom
        ];
    }
    else {
        this.extent = copy(extent);
    }
}

Extent.prototype.getArray = function () {
    return copy(this.extent);
};

Extent.prototype.getCoordinates = function () {
    return copy(this.extent);
};

Extent.prototype.getDictionary = function () {
    return {
        minX: this.extent[0],
        minY: this.extent[1],
        maxX: this.extent[2],
        maxY: this.extent[3]
    };
};

Extent.prototype.clone = function () {
    return (new Extent(this));
};

Extent.prototype.toPolygon = function () {
    return (new Polygon(turf.bboxPolygon(this.extent)));
};

Extent.prototype.normalize = function () {
    var tmp;
    if (this.extent[0] > this.extent[2]) {
        tmp = this.extent[0];
        this.extent[0] = this.extent[2];
        this.extent[2] = tmp;
    }
    if (this.extent[1] > this.extent[3]) {
        tmp = this.extent[1];
        this.extent[1] = this.extent[3];
        this.extent[3] = tmp;
    }
    return this;
};

Extent.prototype.intersects = function(v) {
    var r = v,
        e = this.extent;
    // if it's a point, make it a rect
    if (2 === v.length) {
        r.push(v[0]);
        r.push(v[1]);
    }
    return (
        e[0] <= r[2]
        && r[0] <= e[2]
        && e[1] <= r[3]
        && r[1] <= e[3]
    );
};

Extent.prototype.add = function(extent) {
    extent = (extent instanceof Extent) ? extent : new Extent(extent);
    this.extent[0] = Math.min(this.extent[0], extent.extent[0]);
    this.extent[1] = Math.min(this.extent[1], extent.extent[1]);
    this.extent[2] = Math.max(this.extent[2], extent.extent[2]);
    this.extent[3] = Math.max(this.extent[3], extent.extent[3]);
    return this;
};

Extent.prototype.bound = function (optExtent) {
    var e = (new Extent(optExtent)).getCoordinates(),
        result = new Array(4);

    result[0] = Math.max(e[0], this.extent[0]);
    result[1] = Math.max(e[1], this.extent[1]);
    result[2] = Math.min(e[2], this.extent[2]);
    result[3] = Math.min(e[3], this.extent[3]);
    return (new Extent(result));
};

Extent.prototype.buffer = function (value) {
    var w = this.getWidth(),
        h = this.getHeight(),
        d = Math.sqrt((w*w) + (h*h)),
        dn = d + value,
        wn = w * (dn / d),
        hn = h * (dn / d),
        c = this.getCenter().getCoordinates();
    this.extent = [
        c[0] - (wn / 2),
        c[1] - (hn / 2),
        c[0] + (wn / 2),
        c[1] + (hn / 2)
    ];
    return this;
};

Extent.prototype.maxSquare = function () {
    var w = this.getWidth(),
        h = this.getHeight();
    if (w < h) {
        var bw = (h - w) / 2;
        this.extent[0] -= bw;
        this.extent[2] += bw;
    }
    else if (h < w) {
        var bh = (w - h) / 2;
        this.extent[1] -= bh;
        this.extent[3] += bh;
    }
    return this;
};


Extent.prototype.minSquare = function () {
    // TODO
};

Extent.prototype.getHeight = function () {
    return Math.abs(this.extent[3] - this.extent[1]);
};

Extent.prototype.getWidth = function () {
    return Math.abs(this.extent[2] - this.extent[0]);
};

Extent.prototype.getBottomLeft = function () {
    return new Point([this.extent[0], this.extent[1]]);
};

Extent.prototype.getBottomRight = function () {
    return new Point([this.extent[2], this.extent[1]]);
};

Extent.prototype.getTopLeft = function () {
    return new Point([this.extent[0], this.extent[3]]);
};

Extent.prototype.getTopRight = function () {
    return new Point([this.extent[2], this.extent[3]]);
};

Extent.prototype.getCenter = function () {
    return new Point([
        (this.extent[0] + this.extent[2]) / 2,
        (this.extent[1] + this.extent[3]) / 2
    ]);
};

Extent.prototype.getSurface = function () {
    return this.getHeight() * this.getWidth();
};


function toDMS (lat, lng) {
    var latD, latM, latS,
        lngD, lngM, lngS,
        latAbs, lngAbs, latAz, lngAz;
    if (_.isArray(lat)) {
        lng = lat[0];
        lat = lat[1];
    }

    latAbs = Math.abs(lat);
    lngAbs = Math.abs(lng);
    latAz = (lat < 0) ? 'S' : 'N';
    lngAz = (lng < 0) ? 'W' : 'E';

    latD = Math.floor(latAbs);
    latM = Math.floor(60 * (latAbs - latD));
    latS = 3600 * (latAbs - latD - latM/60);


    lngD = Math.floor(lngAbs);
    lngM = Math.floor(60 * (lngAbs - lngD));
    lngS = 3600 * (lngAbs - lngD - lngM/60);

    return [
        latD + '°', latM + '\'', latS.toPrecision(4) + '\'', latAz,
        lngD + '°', lngM + '\'', lngS.toPrecision(4) + '\'', lngAz
    ].join(' ');
}


module.exports.Geometry = Geometry;
module.exports.Extent = Extent;
module.exports.Point = Point;
module.exports.LineString = LineString;
module.exports.Polygon = Polygon;
module.exports.toDMS = toDMS;
