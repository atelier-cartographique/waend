/*
 * app/src/Program.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */

'use strict';

function Program (ctx) {

    ctx.linestring = function (coordinates, props) {
        ctx.emit('draw', 'line', coordinates);
    };


    ctx.polygon = function (coordinates, props) {
        ctx.emit('draw', 'polygon', coordinates);
    };
}

module.exports = exports = Program;
