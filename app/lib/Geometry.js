/*
 * app/lib/Region.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */

// 'use strict';


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
    return (new Extent(turf.extent(this._geometry)));
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
    else {
        this.extent = copy(extent);
    }
}

Extent.prototype.getArray = function () {
    return copy(this.extent);
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
        latD + '°', latM + "′", latS.toPrecision(4) + "″", latAz,
        lngD + '°', lngM + "′", lngS.toPrecision(4) + "″", lngAz
        ].join(' ');
}


module.exports.Geometry = Geometry;
module.exports.Extent = Extent;
module.exports.Point = Point;
module.exports.LineString = LineString;
module.exports.Polygon = Polygon;
module.exports.toDMS = toDMS;
