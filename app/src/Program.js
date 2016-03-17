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

    var currentExtent,
        currentTransform,
        viewport,
        textures;

    var getParameter = function (props, k, def) {
        return ctx.getProperty(props, 'params.'+ k, def);
    };

    var getStyle = function (props, k, def) {
        return ctx.getProperty(props, 'style.'+ k, def);
    };

    var startFeature = function (props, fm) {
        ctx.processStyle(props, new ctx.Transform(fm));
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

    ctx.startFrame = function (startedWith, opt_extent, opt_matrix, features) {
        currentExtent = new ctx.Geometry.Extent(opt_extent);
        currentTransform = new ctx.Transform(opt_matrix);

        var poly = currentExtent.toPolygon().getCoordinates();
        ctx.polygonProject(poly);
        ctx.polygonTransform(currentTransform, poly);
        var tpoly = new ctx.Geometry.Polygon(poly);
        viewport = tpoly.getExtent();
        ctx.emit('clearRect', viewport.getCoordinates());
        ctx.emit('clip', 'begin', tpoly.getCoordinates());
        textures = {};
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
            var extent = (new ctx.Geometry.LineString(coordinates)).getExtent();
            if ((extent.getHeight() > 1) || (extent.getWidth() > 1)) {
                ctx.emit('draw', 'line', coordinates);
            }
        }
        endFeature();
    };

    var addTexture = function (tkey, extent, props) {

        var bviewport = viewport.clone().maxSquare().buffer(viewport.getWidth() * 0.7),
            center = viewport.getCenter(),
            height = extent.getHeight(),
            paramHN = getParameter(props, 'hn', 24),
            hatchLen = Math.floor((bviewport.getHeight() * paramHN) / height),
            bottomLeft = bviewport.getBottomLeft().getCoordinates(),
            topRight = bviewport.getTopRight().getCoordinates(),
            start =  bottomLeft[1],
            left = bottomLeft[0],
            right = topRight[0],
            patternCoordinates = [],
            strokeColor = getStyle(props, 'strokeStyle', '#000'),
            step = Math.ceil(bviewport.getHeight() / hatchLen),
            lineWidth = getStyle(props, 'lineWidth', 1),
            turnFlag = false,
            rotation = getParameter(props, 'rotation'),
            paramStep = getParameter(props, 'step');

        patternCoordinates.push([left, start]);

        if (paramStep) {
            step = Math.ceil(paramStep * currentTransform.getScale()[0]);
            hatchLen = Math.floor(bviewport.getHeight() / step);
        }

        ctx.emit('startTexture', tkey);
        if (step <= (1 * lineWidth)) {
            if (!('style' in props)) {
                props.style = {};
            }
            props.style.fillStyle = strokeColor;
            ctx.processStyle(props, currentTransform);
            var rcoords = viewport.toPolygon().getCoordinates();
            ctx.emit('draw', 'polygon', rcoords, ['closePath', 'fill']);
        }
        else {
            ctx.processStyle(props, currentTransform);
            var y;
            for (i = 0; i < hatchLen; i++) {
                y = start + (i*step);
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
                rt.rotate(rotation, ccoords);
                ctx.lineTransform(rt, patternCoordinates);
            }

            ctx.emit('draw', 'line', patternCoordinates);
        }
        ctx.emit('endTexture');
        textures[tkey] = true;
    };

    var getTexture = function (extent, props) {
        var strokeColor = getStyle(props, 'strokeStyle', '#000'),
            lineWidth = getStyle(props, 'lineWidth', 1),
            rotation = getParameter(props, 'rotation', 0),
            paramHN = Math.floor((viewport.getHeight() * getParameter(props, 'hn', 24)) / extent.getHeight()),
            step = viewport.getHeight() / paramHN,
            paramStep = getParameter(props, 'step'),
            hs = [];


        if (paramStep) {
            step = paramStep * currentTransform.getScale()[0];
            paramHN = 'n';
        }
        else {
            paramStep = 'n';
        }

        var ceiledStep = Math.ceil(step);

        hs.push(ceiledStep.toString());
        hs.push(strokeColor.toString());
        hs.push(lineWidth.toString());
        hs.push(rotation.toString());

        var tkey = hs.join('-');

        if (!(tkey in textures)) {
            var ts = Date.now();
            addTexture(tkey, extent, props);
            console.log('create texture', tkey, Object.keys(textures).length, Date.now() - ts);
        }
        return tkey;
    };

    var hatchedPolygon = function (coordinates, props, fm) {
        var T = new ctx.Transform(fm);
        ctx.polygonProject(coordinates);
        ctx.polygonTransform(T, coordinates);
        var p = new ctx.Geometry.Polygon(coordinates),
            initialExtent = p.getExtent(),
            initialHeight = initialExtent.getHeight(),
            initialWidth = initialExtent.getWidth();

        if ((initialHeight < 1) || (initialWidth < 1)) {
            return;
        }

        var tkey = getTexture(initialExtent, props);

        ctx.emit('clip', 'begin', coordinates);
        ctx.emit('applyTexture', tkey);
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
            'adjust': getParameter(props, 'adjust', 'none'), // 'fit', 'cover'
            'rotation': getParameter(props, 'rotation', false)
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
