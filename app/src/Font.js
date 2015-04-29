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

var fonts = {};

module.exports.select = function (name, callback, ctx) {
    if(name in fonts) {
        callback.call(ctx, fonts[name]);
        // return opentype.parse(fonts[name].buffer);
    }
    else {
        url = FONT_URL + name;
        opentype.load(url, function (err, f) {
            if (err) {
                console.error(err);
            }
            else {
                fonts[name] = f;
                callback.call(ctx, fonts[name]);
            }
        });
    }
};

module.exports.Font = opentype.Font;
module.exports.Glyph = opentype.Glyph;
module.exports.Path = opentype.Path;
