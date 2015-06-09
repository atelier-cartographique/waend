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

    var getParameter = function (props, k, def) {
        return ctx.getProperty(props, 'params.'+k, def);
    };

    var startFeature = function (geom, props, fm) {
        var T = new ctx.Transform(fm);
        ctx.processStyle(props, T);
    };

    var endFeature = function () {
        ctx.emit('restore');
    };

    var textedLine = function (coordinates, props, fm) {
        var T = new ctx.Transform(fm);
        ctx.lineProject(coordinates);
        ctx.drawTextOnLine(T, coordinates,
            getParameter(props, 'text'),
            getParameter(props, 'fontsize'));
    };


    ctx.linestring = function (coordinates, props, fm) {
        startFeature(props, fm);
        var txt = getParameter(props, 'text');
        if (txt) {
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
            paramHN = getParameter(props, 'hn', 24),
            hatchLen = (height * paramHN) / initialHeight,
            center = extent.getCenter(),
            bottomLeft = extent.getBottomLeft().getCoordinates(),
            topRight = extent.getTopRight().getCoordinates(),
            start = bottomLeft[1],
            left = bottomLeft[0],
            right = topRight[0],
            patternCoordinates = [],
            strokeColor = getParameter(props, 'color', '#000'),
            step = height / hatchLen,
            lineWidth = getParameter(props, 'hatchwidth',
                                    getParameter(props, 'linewidth', 1)),
            turnFlag = false,
            rotation = getParameter(props, 'rotation'),
            paramStep = getParameter(props, 'step');

        patternCoordinates.push([left, bottomLeft[1]]);

        if (paramStep) {
            step = paramStep * T.getScale()[0];
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

        if (rotation) {
            var rt = new ctx.Transform(),
                ccoords = center.getCoordinates();
            rt.rotate(rotation, {'x': ccoords[0], 'y': ccoords[1]});
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
        var fs = getParameter(props, 'fontsize');
        if (fs) {
            ctx.drawTextInPolygon(T, p,
                getParameter(props, 'text'), fs);
        }
        else {
            ctx.drawTextInPolygonAuto(T, p,
                getParameter(props, 'text'));
        }
    };


    var imagedPolygon = function (coordinates, img, props, fm) {
        var T = new ctx.Transform(fm);
        ctx.polygonProject(coordinates);
        ctx.polygonTransform(T, coordinates);
        var p = new ctx.Geometry.Polygon(coordinates),
            extent = p.getExtent().getArray();

        var options = {
            'image': img,
            'clip' : getParameter(props, 'clip', true),
            'adjust': getParameter(props, 'adjust', 'none') // 'fit', 'cover'
        };

        ctx.emit('image', coordinates, extent, options);
    };

    ctx.polygon = function (coordinates, props, fm) {
        startFeature(props, fm);
        var img = getParameter(props, 'image'),
            txt = getParameter(props, 'text');
        if (img) {
            imagedPolygon(coordinates, img, props, fm);
        }
        else if (txt) {
            textedPolygon(coordinates, props, fm);
        }
        else {
            hatchedPolygon(coordinates, props, fm);
        }
        endFeature();
    };
}

module.exports = exports = Program;
