/*
 * app/src/Text.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */

var _ = require('underscore'),
    Hyph = require('hypher'),
    en = require('hyphenation.en-us'),
    hyph = new Hyph(en),
    Font = require('./Font');

function TextCursor (txt, parIndex, clusterIndex, index) {
    this.p = parIndex || 0;
    this.c = clusterIndex || 0;
    this.i = index || 0;

    this.text = txt;
}

TextCursor.prototype.END_PARAGRAPH = -1;
TextCursor.prototype.END_TEXT = -2;

TextCursor.prototype.next = function () {
    var par = this.text.paragraphs[this.p],
        cluster = par[this.c];

    this.i = this.i + 1;

    if (this.i >= cluster.length) {
        this.c = this.c + 1;
        if (this.c >= par.length) {
            this.p = this.p + 1;
            this.c = 0;
            this.i = 0;
            if (this.p >= this.text.paragraphs) {
                this.p = 0;
                return TextCursor.END_TEXT;
            }
            return TextCursor.END_PARAGRAPH;
        }
        cluster = par[this.c];
        this.i = 0;
    }
    return cluster[this.i];
};



function Text (str, fontName) {
    this._string = str.toString();
    this.paragraphs = [];

    var paragraphs_tmp = this._string.split('\n');

    for (var i = 0; i < paragraphs_tmp.length; i++) {
        var paragraph = paragraphs_tmp[i],
            words = paragraph.split(' '),
            clusters = [];

        for (var j = 0; j < words.length; j++) {
            if(j > 0) {
                clusters.push(' ');
            }
            var hc = hyph.hyphenate(words[j]);
            for (var c = 0; c < hc.length; c++) {
                clusters.push(hc[c]);
            }
        }
        this.paragraphs.push(clusters);
    }

    // font loading
    this._pendings = [];
    if (!fontName || _.isString(fontName)) {
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
    else {
        this.font = fontName;
    }
}

Text.prototype.whenReady = function (fn, ctx) {
    if(!this.ready) {
        this._pendings.push([fn, ctx]);
    }
    else {
        fn.call(ctx, this);
    }
};

Text.prototype.getFont = function () {
    return this.font;
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
        gc,
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

Text.prototype.drawOnCanvas = function (ctx, startPos, sz) {
    // this.font.draw(ctx, this._string, startPos[0], startPos[1], sz);
    var fullPath = new Font.Path();
    this.font.forEachGlyph(
        this._string, startPos[0], startPos[1], sz, {},
        function(glyph, gX, gY, gFontSize) {
        var glyphPath = glyph.getPath(gX, gY, gFontSize);
        fullPath.extend(glyphPath);
    });
    fullPath.fill = ctx.fillStyle;
    fullPath.stroke = undefined;
    fullPath.draw(ctx);
};

Text.prototype.getRect = function (startPos, sz) {
    var xMin = Infinity,
        xMax = - Infinity,
        yMin = Infinity,
        yMax = - Infinity;

    var uem = this.font.unitsPerEm;
    var viz = function (glyph, gX, gY, gFontSize) {
        var scale = 1 / uem * gFontSize,
            ms = glyph.getMetrics();

        xMin = Math.min(xMin, gX + (ms.xMin * scale));
        xMax = Math.max(xMax, gX + (ms.xMax * scale));
        yMin = Math.min(yMin, gY - (ms.yMax * scale));
        yMax = Math.max(yMax, gY + (ms.yMin * scale));
    };

    this.font.forEachGlyph(
        this._string, startPos[0], startPos[1], sz, {}, viz
    );

    return [xMin, yMin, xMax, yMax];
};

/*

Font.prototype.drawMetrics = function(ctx, text, x, y, fontSize, options) {
    this.forEachGlyph(text, x, y, fontSize, options, function(glyph, gX, gY, gFontSize) {
        glyph.drawMetrics(ctx, gX, gY, gFontSize);
    });
};

Glyph.prototype.drawMetrics = function(ctx, x, y, fontSize) {
    var scale;
    x = x !== undefined ? x : 0;
    y = y !== undefined ? y : 0;
    fontSize = fontSize !== undefined ? fontSize : 24;
    scale = 1 / this.path.unitsPerEm * fontSize;
    ctx.lineWidth = 1;

    // Draw the origin
    ctx.strokeStyle = 'black';
    draw.line(ctx, x, -10000, x, 10000);
    draw.line(ctx, -10000, y, 10000, y);

    // This code is here due to memory optimization: by not using
    // defaults in the constructor, we save a notable amount of memory.
    var xMin = this.xMin || 0;
    var yMin = this.yMin || 0;
    var xMax = this.xMax || 0;
    var yMax = this.yMax || 0;
    var advanceWidth = this.advanceWidth || 0;

    // Draw the glyph box
    ctx.strokeStyle = 'blue';
    draw.line(ctx, x + (xMin * scale), -10000, x + (xMin * scale), 10000);
    draw.line(ctx, x + (xMax * scale), -10000, x + (xMax * scale), 10000);
    draw.line(ctx, -10000, y + (-yMin * scale), 10000, y + (-yMin * scale));
    draw.line(ctx, -10000, y + (-yMax * scale), 10000, y + (-yMax * scale));

    // Draw the advance width
    ctx.strokeStyle = 'green';
    draw.line(ctx, x + (advanceWidth * scale), -10000, x + (advanceWidth * scale), 10000);
};



*/

module.exports = exports = Text;
