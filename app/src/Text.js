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
    Font = require('./Font'),
    defaultFont = Font.select('default');

function Text (str) {
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

    this.font = defaultFont;
}

/*
opentype.js getPath flips Ys, it's fair. but as long as we flip the viewport to
accomodate with a weird OL3 behaviour, ther's no point to flip glyphs.
*/
function getPath (x, y, fontSize) {
    var scale, p, commands, cmd;
    x = x !== undefined ? x : 0;
    y = y !== undefined ? y : 0;
    fontSize = fontSize !== undefined ? fontSize : 72;
    scale = 1 / this.font.unitsPerEm * fontSize;
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

// font size & horizontal segments
// a hyper basic text composer
Text.prototype.draw = function (fontsz, segments, offset) {
    var csIdx = 0, cs = segments[csIdx],
        gcs, gc,
        cx = cs[0][0],
        cy = cs[0][1],
        nx = cs[1][0],
        scale =  fontsz / this.font.unitsPerEm, sa,
        paths = [],
        clusters = this.clusters;

    offset = offset || [0,0];
    var cOffset = offset[0];
    var gOffset = offset[1];
    for (var ii = cOffset; ii < clusters.length; ii++) {
        gc = this.font.stringToGlyphs(clusters[ii]);
        for (var iii = gOffset; iii < gc.length; iii++) {
            g = gc[iii];
            sa = g.advanceWidth * scale;
            if ((cx + sa) < nx) {
                paths.push(getPath.apply(g, [cx, cy, fontsz]));
                cx += sa;
                gOffset += 1;
            }
            else {
                csIdx++;
                if(csIdx >= (segments.length - 1)) {
                    // no more space
                    return [[cOffset, gOffset], paths];
                }
                cs = segments[csIdx];
                cx = cs[0][0];
                cy = cs[0][1];
                nx = cs[1][0];
                iii--; // try again on next segment
            }
        }
        gOffset = 0;
        cOffset += 1;
    }
    return [null, paths];
};


module.exports = exports = Text;
