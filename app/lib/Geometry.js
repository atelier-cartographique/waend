import _ from 'underscore';
import util from 'util';
import turf from 'turf';


function copy (data) {
    return JSON.parse(JSON.stringify(data));
}

class Geometry {
    constructor(data) {
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

    clone() {
        return (new Geometry(this));
    }

    getType() {
        return this._geometry.type;
    }

    getCoordinates() {
        return copy(this._geometry.coordinates);
    }

    getExtent() {
        return (new Extent(turf.bbox(this._geometry)));
    }

    toGeoJSON() {
        return copy(this._geometry);
    }
}


function Point () {
    let data = arguments[0];
    if (_.isArray(data)) {
        data = turf.point(data);
    }
    Geometry.call(this, data);
}
util.inherits(Point, Geometry);


class LineString {
    constructor() {
        let data = arguments[0];
        if (_.isArray(data)) {
            data = turf.lineString(data);
        }
        Geometry.call(this, data);
    }

    appendCoordinate(opt_point) {
        const p = new Point(opt_point);
        this._geometry.coordinates.push(p.getCoordinates());
    }
}

util.inherits(LineString, Geometry);


function Polygon () {
    let data = arguments[0];
    if (_.isArray(data)) {
        data = turf.polygon(data);
    }
    Geometry.call(this, data);
}
util.inherits(Polygon, Geometry);



class Extent {
    constructor(extent) { // whether from an [minx, miny, maxx, maxy] extent or an Extent
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

    getArray() {
        return copy(this.extent);
    }

    getCoordinates() {
        return copy(this.extent);
    }

    getDictionary() {
        return {
            minX: this.extent[0],
            minY: this.extent[1],
            maxX: this.extent[2],
            maxY: this.extent[3]
        };
    }

    clone() {
        return (new Extent(this));
    }

    toPolygon() {
        return (new Polygon(turf.bboxPolygon(this.extent)));
    }

    normalize() {
        let tmp;
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
    }

    intersects(v) {
        const r = v;
        const e = this.extent;
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
    }

    add(extent) {
        extent = (extent instanceof Extent) ? extent : new Extent(extent);
        this.extent[0] = Math.min(this.extent[0], extent.extent[0]);
        this.extent[1] = Math.min(this.extent[1], extent.extent[1]);
        this.extent[2] = Math.max(this.extent[2], extent.extent[2]);
        this.extent[3] = Math.max(this.extent[3], extent.extent[3]);
        return this;
    }

    bound(optExtent) {
        const e = (new Extent(optExtent)).getCoordinates();
        const result = new Array(4);

        result[0] = Math.max(e[0], this.extent[0]);
        result[1] = Math.max(e[1], this.extent[1]);
        result[2] = Math.min(e[2], this.extent[2]);
        result[3] = Math.min(e[3], this.extent[3]);
        return (new Extent(result));
    }

    buffer(value) {
        const w = this.getWidth();
        const h = this.getHeight();
        const d = Math.sqrt((w*w) + (h*h));
        const dn = d + value;
        const wn = w * (dn / d);
        const hn = h * (dn / d);
        const c = this.getCenter().getCoordinates();
        this.extent = [
            c[0] - (wn / 2),
            c[1] - (hn / 2),
            c[0] + (wn / 2),
            c[1] + (hn / 2)
        ];
        return this;
    }

    maxSquare() {
        const w = this.getWidth();
        const h = this.getHeight();
        if (w < h) {
            const bw = (h - w) / 2;
            this.extent[0] -= bw;
            this.extent[2] += bw;
        }
        else if (h < w) {
            const bh = (w - h) / 2;
            this.extent[1] -= bh;
            this.extent[3] += bh;
        }
        return this;
    }

    minSquare() {
        // TODO
    }

    getHeight() {
        return Math.abs(this.extent[3] - this.extent[1]);
    }

    getWidth() {
        return Math.abs(this.extent[2] - this.extent[0]);
    }

    getBottomLeft() {
        return new Point([this.extent[0], this.extent[1]]);
    }

    getBottomRight() {
        return new Point([this.extent[2], this.extent[1]]);
    }

    getTopLeft() {
        return new Point([this.extent[0], this.extent[3]]);
    }

    getTopRight() {
        return new Point([this.extent[2], this.extent[3]]);
    }

    getCenter() {
        return new Point([
            (this.extent[0] + this.extent[2]) / 2,
            (this.extent[1] + this.extent[3]) / 2
        ]);
    }

    getSurface() {
        return this.getHeight() * this.getWidth();
    }
}


function toDMS (lat, lng) {
    let latD;
    let latM;
    let latS;
    let lngD;
    let lngM;
    let lngS;
    let latAbs;
    let lngAbs;
    let latAz;
    let lngAz;
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
        `${latD}°`, `${latM}'`, `${latS.toPrecision(4)}'`, latAz,
        `${lngD}°`, `${lngM}'`, `${lngS.toPrecision(4)}'`, lngAz
    ].join(' ');
}


export {Geometry};
export {Extent};
export {Point};
export {LineString};
export {Polygon};
export {toDMS};

export default {
    Geometry,
    Extent,
    Point,
    LineString,
    Polygon,
    toDMS
};
