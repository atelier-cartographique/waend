/*
 * app/src/Font.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */



var config = require('../../config'),
    opentype = require('opentype.js');

var FONT_URL = config.public.baseUrl + '/fonts/';

var fonts = {},
    pendings = {};


function processPendings (name) {
    var ps = pendings[name],
        f = fonts[name];
    delete pendings[name];

    for (var i = 0, l = ps.length; i < l; i++) {
        var p = ps[i];
        p[0].call(p[1], f);
    }
}

module.exports.select = function (name, callback, ctx) {
    if(name in fonts) {
        callback.call(ctx, fonts[name]);
    }
    else if (name in pendings) {
        pendings[name].push([callback, ctx]);
    }
    else {
        pendings[name] = [[callback, ctx]];
        url = FONT_URL + name;
        opentype.load(url, function (err, f) {
            if (err) {
                console.error(err);
            }
            else {
                fonts[name] = f;
                processPendings(name);
            }
        });
    }
};

module.exports.Font = opentype.Font;
module.exports.Glyph = opentype.Glyph;
module.exports.Path = opentype.Path;
