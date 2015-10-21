/*
 * app/src/Belgika.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */

var _ = require('underscore'),
    belgica = require('./belgica'),
    helpers = require('../lib/helpers'),
    Geometry = require('../lib/Geometry'),
    Transform = require('../lib/Transform');

vecEquals = helpers.vecEquals;

function Path (fragments, transform) {
    this.fragments = fragments;
    this.transform = transform;

    Object.defineProperty(this, 'commands', {
        get: this.makeCommands
    });
}

Path.prototype.makeMove = function (x, y) {
    var v = [x, y];
    this.transform.mapVec2(v);
    return {
        'type': 'M',
        'x': v[0],
        'y': v[1]
    };
};

Path.prototype.makeLine = function (x, y) {
    var v = [x, y];
    this.transform.mapVec2(v);
    return {
        'type': 'L',
        'x': v[0],
        'y': v[1]
    };
};

Path.prototype.makeCurve = function (cx1, cy1, cx2, cy2, x, y) {
    var c1 = [cx1, cy1],
        c2 = [cx2, cy2],
        to = [x, y];
    this.transform.mapVec2(c1);
    this.transform.mapVec2(c2);
    this.transform.mapVec2(to);
    return {
        'type': 'C',
        'x': to[0],
        'y': to[1],
        'x1': c1[0],
        'y1': c1[1],
        'x2': c2[0],
        'y2': c2[1]
    };
};


Path.prototype.makeCommands = function () {
    var pts = this.fragments,
        cmds = [],
        currentPoint;

    for (var i = 0; i < pts.length; i++) {
        var fragment = pts[i].points,
            type = pts[i].type;
        if (!currentPoint
            || !vecEquals(currentPoint, [fragment.start.x, fragment.start.y])) {
            cmds.push(this.makeMove(fragment.start.x, fragment.start.y));
        }
        if ('L' === type) {
            cmds.push(this.makeLine(fragment.end.x, fragment.end.y));
        }
        else if('C' === type) {
            cmds.push(this.makeCurve(
                fragment.control1.x, fragment.control1.y,
                fragment.control2.x, fragment.control2.y,
                fragment.end.x, fragment.end.y));
        }
        currentPoint = [fragment.end.x, fragment.end.y];
    }

    return cmds;
};

function Glyph (font, data) {
    this.font = font;
    for (var key in data) {
        Object.defineProperty(this, key, {
            value: data[key]
        });
    }
}

Glyph.prototype.getPath = function (x, y, sz) {
    var t = new Transform(),
        s = sz / this.font.unitsPerEm;
    t.scale(s, -s);
    t.translate(x, y);
    return (new Path(this.glyph, t));
};

function Belgika () {
    this.glyphs = belgica.glyphs;
    for (var key in belgica.fontInfo) {
        Object.defineProperty(this, key, {
            value: belgica.fontInfo[key]
        });
    }
}

Belgika.prototype.stringToGlyphs = function (str) {
    var glyphs = [];
    for (var i = 0; i < str.length; i++) {
        var ccode = str.charCodeAt(i);
        if (ccode in this.glyphs) {
            glyphs.push(new Glyph(this, this.glyphs[ccode]));
        }
    }
    return glyphs;
};

module.exports = exports = Belgika;
