/*
 * app/src/Text.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */

var Hyph = require('hypher'),
    en = require('hyphenation.en-us'),
    hyph = new Hyph(en),
    Font = require('./Font');

function Text (str, fontName) {
    this._string = str;
    var strs = str.split(' ');
    this.clusters = [];
    for (var i = 0; i < strs.length; i++) {
        if(i > 0) {
            this.clusters.push(' ');
        }
        var hc = hyph.hyphenate(strs[i]);
        for (var c = 0; c < hc.length; c++) {
            this.clusters.push(hc[c]);
        }
    }
    this._pendings = [];
    fontName = fontName || 'default';
    Font.select(fontName, function (f) {
        this.font = f;
        this.ready = true;
        for (var i = 0; i < this._pendings.length; i++) {
            var pending = this._pendings[i],
                fn = pending[0],
                ctx = pending[1];
            fn.call(ctx, this);
        }
        this._pendings = [];
    }, this);
}

Text.prototype.whenReady = function (fn, ctx) {
    if(!this.ready) {
        this._pendings.push([fn, ctx]);
    }
    else {
        fn.call(ctx, this);
    }
};

/*
opentype.js getPath flips Ys, it's fair. but as long as we flip the viewport to
accomodate with a weird OL3 behaviour, ther's no point to flip glyphs.
*/
function getPath (x, y, fontSize) {
    var scale, p, commands, cmd;
    x = x !== undefined ? x : 0;
    y = y !== undefined ? y : 0;
    fontSize = fontSize !== undefined ? fontSize : 72;
    scale = 1 / this.path.unitsPerEm * fontSize;
    p = new Font.Path();
    commands = this.path.commands;
    for (var i = 0; i < commands.length; i += 1) {
        cmd = commands[i];
        if (cmd.type === 'M') {
            p.moveTo(x + (cmd.x * scale), y + (cmd.y * scale));
        } else if (cmd.type === 'L') {
            p.lineTo(x + (cmd.x * scale), y + (cmd.y * scale));
        } else if (cmd.type === 'Q') {
            p.quadraticCurveTo(x + (cmd.x1 * scale), y + (cmd.y1 * scale),
                               x + (cmd.x * scale), y + (cmd.y * scale));
        } else if (cmd.type === 'C') {
            p.curveTo(x + (cmd.x1 * scale), y + (cmd.y1 * scale),
                      x + (cmd.x2 * scale), y + (cmd.y2 * scale),
                      x + (cmd.x * scale), y + (cmd.y * scale));
        } else if (cmd.type === 'Z') {
            p.closePath();
        }
    }
    return p;
}


function vecDist (v1, v2) {
    var dx = v2[0] - v1[0],
        dy = v2[1] - v1[1];
    return Math.sqrt((dx*dx) + (dy*dy));
}

function vecAdd (v1, v2, a) {
    var t = a / vecDist(v1, v2),
        rx = v1[0] + (v2[0] - v1[0]) * t,
        ry = v1[1] + (v2[1] - v1[1]) * t;
    return [rx, ry];
}


Text.prototype.getFlatLength = function (fontSize) {
    var glyphs = this.font.stringToGlyphs(this._string),
        scale =  fontSize / this.font.unitsPerEm,
        len = 0;

    for (var i = 0, gl = glyphs.length; i < gl; i++) {
        len += glyphs[i].advanceWidth * scale;
    }

    return len;
};

// font size & horizontal segments
// a hyper basic text composer
Text.prototype.draw = function (fontsz, segments, offset, mergeSegments) {
    if (!this.font) {
        console.warn('Text.prototype.draw NoFont');
        return [null, []];
    }
    var csIdx = 0, cs = segments[csIdx],
        gcs, gc,
        curPos = cs[0],
        endPos = cs[1],
        scale =  fontsz / this.font.unitsPerEm, sa,
        paths = [],
        clusters = this.clusters,
        currentPath;

    offset = offset || [0,0];
    var cOffset = offset[0];
    var gOffset = offset[1];
    for (var ii = cOffset; ii < clusters.length; ii++) {
        gc = this.font.stringToGlyphs(clusters[ii]);
        for (var iii = gOffset; iii < gc.length; iii++) {
            g = gc[iii];
            sa = g.advanceWidth * scale;
            if (sa < vecDist(curPos, endPos)) {
                currentPath = getPath.apply(g, [curPos[0], curPos[1], fontsz]);
                currentPath.segment = cs;
                currentPath.pos = curPos;
                currentPath.nextPos = vecAdd(curPos, endPos, sa);
                paths.push(currentPath);
                gOffset += 1;
                curPos = currentPath.nextPos;
            }
            else {
                csIdx++;
                if(csIdx >= (segments.length - 1)) {
                    // no more space
                    return [[cOffset, gOffset], paths];
                }
                if (mergeSegments) {
                    cs = [curPos, segments[csIdx][1]];
                }
                else {
                    cs = segments[csIdx];
                }
                curPos = cs[0];
                endPos = cs[1];
                iii--; // try again on next segment
            }
        }
        gOffset = 0;
        cOffset += 1;
    }
    return [null, paths];
};


module.exports = exports = Text;
