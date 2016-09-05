/*
 * app/src/Font.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */



import config from '../config';

import opentype from 'opentype.js';


let FONT_URL = `${config.public.baseUrl}/fonts/`;
if (typeof window === 'undefined') {
    FONT_URL = `${__dirname}/../../fonts/`;
}


const fonts = {};
const pendings = {};


function processPendings (name) {
    const ps = pendings[name];
    const f = fonts[name];
    delete pendings[name];

    for (let i = 0, l = ps.length; i < l; i++) {
        const p = ps[i];
        p[0].call(p[1], f);
    }
}

export function select(name, callback, ctx) {
    if(name in fonts) {
        callback.call(ctx, fonts[name]);
    }
    else if (name in pendings) {
        pendings[name].push([callback, ctx]);
    }
    else {
        pendings[name] = [[callback, ctx]];
        url = FONT_URL + name;
        opentype.load(url, (err, f) => {
            if (err) {
                console.error(err);
            }
            else {
                fonts[name] = f;
                processPendings(name);
            }
        });
    }
}

export const Font = opentype.Font;
export const Glyph = opentype.Glyph;
export const Path = opentype.Path;
