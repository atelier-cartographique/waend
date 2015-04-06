/*
 * app/src/Program.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */


function Program (ctx) {

    ctx.linestring = function (coordinates, props, fm) {
        ctx.lineProject(coordinates);
        ctx.emit('draw', 'line', coordinates);
    };

    var hatchedPolygon = function (coordinates, props, fm) {
        ctx.polygonProject(coordinates);
        var p = new ctx.Geometry.Polygon(coordinates);
        var extent = p.getExtentObject(),
            hatchLen = 24,
            height = extent.getHeight(),
            step = height / hatchLen,
            bottomLeft = extent.getBottomLeft().getCoordinates(),
            topRight = extent.getTopRight().getCoordinates(),
            left = bottomLeft[0],
            right = topRight[0],
            patternCoordinates = [],
            turnFlag = false;

        patternCoordinates.push([left, bottomLeft[1]]);

        for (i = 0; i < hatchLen; i++) {
          var y = bottomLeft[1] + (i*step);
          if (turnFlag) {
            if (i > 0) {
              patternCoordinates.push([right, y]);
            }
            patternCoordinates.push([left, y]);
          }
          else {
            if (i > 0) {
              patternCoordinates.push([left, y]);
            }
            patternCoordinates.push([right, y]);
          }
          turnFlag = !turnFlag;
        }
        ctx.emit('clip', 'begin', coordinates);
        ctx.emit('draw', 'line', patternCoordinates);
        ctx.emit('clip', 'end');
    };

    var textedPolygon = function (coordinates, props, fm) {
        ctx.polygonProject(coordinates);
        var T = new ctx.Transform(fm);
        // ctx.polygonTransform(T, coordinates);
        var p = new ctx.Geometry.Polygon(coordinates);
        ctx.drawTextInPolygon(T, p, props.text, props.fontsize);
    };

    ctx.polygon = function (coordinates, props, fm) {
        if ('text' in props) {
            textedPolygon(coordinates, props, fm);
        }
        else {
            hatchedPolygon(coordinates, props, fm);
        }
    };
}

module.exports = exports = Program;
