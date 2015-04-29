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
        var T = new ctx.Transform(fm);
        ctx.lineProject(coordinates);
        ctx.lineTransform(T, coordinates);
        ctx.emit('draw', 'line', coordinates);
    };

    var hatchedPolygon = function (coordinates, props, fm) {
        var T = new ctx.Transform(fm);
        ctx.polygonProject(coordinates);
        ctx.polygonTransform(T, coordinates);
        var p = new ctx.Geometry.Polygon(coordinates);
        var extent = p.getExtentObject(),
            hatchLen = ('hn' in props) ? props.hn : 24,
            height = extent.getHeight(),
            bottomLeft = extent.getBottomLeft().getCoordinates(),
            topRight = extent.getTopRight().getCoordinates(),
            left = bottomLeft[0],
            right = topRight[0],
            patternCoordinates = [],
            strokeColor = ('color' in props) ? props.color: '#000',
            step = height / hatchLen,
            turnFlag = false;

        patternCoordinates.push([left, bottomLeft[1]]);

        if ('step' in props) {
            step = props.step;
            hatchLen = height / step;
        }

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
        ctx.emit('save');
        ctx.emit('set', 'strokeStyle', strokeColor);
        ctx.emit('clip', 'begin', coordinates);
        ctx.emit('draw', 'line', patternCoordinates);
        ctx.emit('clip', 'end');
        ctx.emit('restore');
    };

    var textedPolygon = function (coordinates, props, fm) {
        var T = new ctx.Transform(fm);
        ctx.polygonProject(coordinates);
        var p = new ctx.Geometry.Polygon(coordinates);
        ctx.drawTextInPolygon(T, p, props.text, props.fontsize);
    };


    var imagedPolygon = function (coordinates, props, fm) {
        var T = new ctx.Transform(fm);
        ctx.polygonProject(coordinates);
        ctx.polygonTransform(T, coordinates);
        var p = new ctx.Geometry.Polygon(coordinates),
            extent = p.getExtent();

        ctx.emit('image:clip', coordinates, extent, props.image);
    };

    ctx.polygon = function (coordinates, props, fm) {
        if ('image' in props) {
            imagedPolygon(coordinates, props, fm);
        }
        else if ('text' in props) {
            textedPolygon(coordinates, props, fm);
        }
        else {
            hatchedPolygon(coordinates, props, fm);
        }
    };
}

module.exports = exports = Program;
