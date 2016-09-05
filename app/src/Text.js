/*
 * app/src/Text.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */

import _ from 'underscore';

import Font from './Font';



class TextCursor {
    constructor(txt) {
        this.text = txt;
        this.p =  0;
        this.i =  0;
    }

    next() {
        const par = this.text.paragraphs[this.p];

        if (this.i >= par.length) {
            this.p = this.p + 1;
            this.i = 0;
            if (this.p >= this.text.paragraphs.length) {
                this.p = 0;
                return TextCursor.END_TEXT;
            }
            return TextCursor.END_PARAGRAPH;
        }
        const c = par[this.i];
        this.i += 1;
        return c;
    }

    rewind() {
        let par = this.text.paragraphs[this.p];
        const i = this.i - 1;

        if (i < 0) {
            this.p -= 1;
            if (this.p < 0) {
                this.p = 0;
                this.i = 0;
                return this;
            }
            par = this.text.paragraphs[this.p];
            this.i = par.length - 1;
            return this;
        }

        this.i = i;
        return this;
    }
}

TextCursor.END_PARAGRAPH = -1;
TextCursor.END_TEXT = -2;

class Text {
    constructor(str, fontName) {
        this._string = str.toString();
        this.paragraphs = this._string.split('\n');

        // font loading
        this._pendings = [];
        if (!fontName || _.isString(fontName)) {
            fontName = fontName || 'default';
            Font.select(fontName, function (f) {
                this.font = f;
                this.ready = true;

                for (const pending of this._pendings) {
                    fn.call(ctx, this);
                }

                this._pendings = [];
            }, this);
        }
        else {
            this.font = fontName;
        }
    }

    cursor() {
        return (new TextCursor(this));
    }

    whenReady(fn, ctx) {
        if(!this.ready) {
            this._pendings.push([fn, ctx]);
        }
        else {
            fn.call(ctx, this);
        }
    }

    getFont() {
        return this.font;
    }

    getFlatLength(fontSize) {
        const glyphs = this.font.stringToGlyphs(this._string);
        const scale =  fontSize / this.font.unitsPerEm;
        let len = 0;

        for (let i = 0, gl = glyphs.length; i < gl; i++) {
            len += glyphs[i].advanceWidth * scale;
        }

        return len;
    }

    // font size & horizontal segments
    // a hyper basic text composer
    draw(fontsz, segments, cursor, mergeSegments) {
        if (!this.font) {
            console.warn('Text.prototype.draw NoFont');
            return [null, []];
        }

        let csIdx = 0;
        let cs = segments[csIdx];
        let curPos = cs[0];
        let endPos = cs[1];
        let nextPos;
        const scale =  fontsz / this.font.unitsPerEm;
        let sa;
        const paths = [];
        let currentPath;

        while (true) {
            const character = cursor.next();
            if (TextCursor.END_TEXT === character) {
                return [null, paths];
            }
            else if (TextCursor.END_PARAGRAPH === character) {
                csIdx++;
                if(csIdx >= segments.length) {
                    return [cursor, paths];
                }
                continue;
            }
            else {
                const glyphs = this.font.stringToGlyphs(character);
                let accAdvance = 0;
                let glyph;
                let gi;

                for (gi = 0; gi < glyphs.length; gi++) {
                    glyph = glyphs[gi];
                    accAdvance += glyph.advanceWidth * scale;
                }

                if (accAdvance < vecDist(curPos, endPos)) {
                    for (gi = 0; gi < glyphs.length; gi++) {
                        glyph = glyphs[gi];
                        const advance = glyph.advanceWidth * scale;
                        currentPath = getPath.apply(glyph, [curPos[0], curPos[1], fontsz]);
                        nextPos = vecAdd(curPos, endPos, accAdvance);
                        currentPath.segment = cs;
                        currentPath.pos = curPos;
                        currentPath.nextPos = nextPos;
                        paths.push(currentPath);
                        curPos = nextPos;
                    }
                }
                else {
                    csIdx++;
                    cursor.rewind();
                    if(csIdx >= segments.length) {
                        return [cursor, paths];
                    }
                    if (mergeSegments) {
                        cs = [curPos, segments[csIdx][1]];
                    }
                    else {
                        cs = segments[csIdx];
                    }
                    curPos = cs[0];
                    endPos = cs[1];
                }
            }
        }

        throw (new Error('Return Undefined From Text Draw'));
    }

    drawOnCanvas(ctx, startPos, sz) {
        // this.font.draw(ctx, this._string, startPos[0], startPos[1], sz);
        const fullPath = new Font.Path();
        this.font.forEachGlyph(
            this._string, startPos[0], startPos[1], sz, {},
            (glyph, gX, gY, gFontSize) => {
                const glyphPath = glyph.getPath(gX, gY, gFontSize);
                fullPath.extend(glyphPath);
            });
        fullPath.fill = ctx.fillStyle;
        fullPath.stroke = undefined;
        fullPath.draw(ctx);
    }

    getRect(startPos, sz) {
        let xMin = Infinity;
        let xMax = - Infinity;
        let yMin = Infinity;
        let yMax = - Infinity;

        const uem = this.font.unitsPerEm;
        const viz = (glyph, gX, gY, gFontSize) => {
            const scale = 1 / uem * gFontSize;
            const ms = glyph.getMetrics();

            xMin = Math.min(xMin, gX + (ms.xMin * scale));
            xMax = Math.max(xMax, gX + (ms.xMax * scale));
            yMin = Math.min(yMin, gY - (ms.yMax * scale));
            yMax = Math.max(yMax, gY + (ms.yMin * scale));
        };

        this.font.forEachGlyph(
            this._string, startPos[0], startPos[1], sz, {}, viz
        );

        return [xMin, yMin, xMax, yMax];
    }
}

/*
opentype.js getPath flips Ys, it's fair. but as long as we flip the viewport to
accomodate with a weird OL3 behaviour, ther's no point to flip glyphs.
*/
function getPath (x, y, fontSize) {
    let scale;
    let p;
    let commands;
    let cmd;
    x = x !== undefined ? x : 0;
    y = y !== undefined ? y : 0;
    fontSize = fontSize !== undefined ? fontSize : 72;
    scale = 1 / this.path.unitsPerEm * fontSize;
    p = new Font.Path();
    commands = this.path.commands;
    for (let i = 0; i < commands.length; i += 1) {
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
    const dx = v2[0] - v1[0];
    const dy = v2[1] - v1[1];
    return Math.sqrt((dx*dx) + (dy*dy));
}

function vecAdd (v1, v2, a) {
    const t = a / vecDist(v1, v2);
    const rx = v1[0] + (v2[0] - v1[0]) * t;
    const ry = v1[1] + (v2[1] - v1[1]) * t;
    return [rx, ry];
}


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

export default Text;
