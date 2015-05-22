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

    var textedLine = function (coordinates, props, fm) {
        var T = new ctx.Transform(fm);
        ctx.lineProject(coordinates);
        ctx.drawTextOnLine(T, coordinates, props.text, props.fontsize);
    };

    var startFeature = function (props) {
        ctx.processStyle(props);
    };

    var endFeature = function () {
        ctx.emit('restore');
    };

    ctx.linestring = function (coordinates, props, fm) {
        startFeature(props);
        if ('text' in props) {
            textedLine(coordinates, props, fm);
        }
        else {
            var T = new ctx.Transform(fm);
            ctx.lineProject(coordinates);
            ctx.lineTransform(T, coordinates);
            ctx.emit('draw', 'line', coordinates);
        }
        endFeature();
    };

    var hatchedPolygon = function (coordinates, props, fm) {
        var T = new ctx.Transform(fm);
        ctx.polygonProject(coordinates);
        ctx.polygonTransform(T, coordinates);
        var p = new ctx.Geometry.Polygon(coordinates),
            initialExtent = p.getExtent(),
            initialHeight = initialExtent.getHeight(),
            initialWidth = initialExtent.getWidth(),
            bufExtent = initialExtent.buffer(Math.max(initialHeight, initialWidth) / 2),
            extent = new ctx.Geometry.Extent(bufExtent),
            height = extent.getHeight(),
            hatchLen = (height * (('hn' in props) ? props.hn : 24)) / initialHeight,
            center = extent.getCenter(),
            bottomLeft = extent.getBottomLeft().getCoordinates(),
            topRight = extent.getTopRight().getCoordinates(),
            start = bottomLeft[1],
            left = bottomLeft[0],
            right = topRight[0],
            patternCoordinates = [],
            strokeColor = ('color' in props) ? props.color: '#000',
            step = height / hatchLen,
            lineWidth = (('hatchwidth' in props) ? props.linewidth : 1),
            turnFlag = false;

        patternCoordinates.push([left, bottomLeft[1]]);

        if ('step' in props) {
            step = props.step;
            hatchLen = height / step;
        }

        for (i = 0; i < hatchLen; i++) {
          var y = start + (i*step);
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

        if ('rotation' in props && !!props.rotation) {
            var rt = new ctx.Transform(),
                ccoords = center.getCoordinates();
            rt.rotate(props.rotation, {'x': ccoords[0], 'y': ccoords[1]});
            // console.log('rotation', props.rotation, ccoords, rt.flatMatrix());
            ctx.lineTransform(rt, patternCoordinates);
        }

        ctx.emit('clip', 'begin', coordinates);
        ctx.emit('draw', 'line', patternCoordinates);
        ctx.emit('clip', 'end');
    };

    var textedPolygon = function (coordinates, props, fm) {
        var T = new ctx.Transform(fm);
        ctx.polygonProject(coordinates);
        var p = new ctx.Geometry.Polygon(coordinates);
        if ('fontsize' in props) {
            ctx.drawTextInPolygon(T, p, props.text, props.fontsize);
        }
        else {
            ctx.drawTextInPolygonAuto(T, p, props.text);
        }
    };


    var imagedPolygon = function (coordinates, props, fm) {
        var T = new ctx.Transform(fm);
        ctx.polygonProject(coordinates);
        ctx.polygonTransform(T, coordinates);
        var p = new ctx.Geometry.Polygon(coordinates),
            extent = p.getExtent().getArray();

        ctx.emit('image:clip', coordinates, extent, props.image);
    };

    ctx.polygon = function (coordinates, props, fm) {
        startFeature(props);
        if ('image' in props) {
            imagedPolygon(coordinates, props, fm);
        }
        else if ('text' in props) {
            textedPolygon(coordinates, props, fm);
        }
        else {
            hatchedPolygon(coordinates, props, fm);
        }
        endFeature();
    };
}

module.exports = exports = Program;
