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
    let currentExtent;
    let currentTransform;
    let viewport;
    let textures;

    const getParameter = (props, k, def) => ctx.getProperty(props, `params.${k}`, def);

    const getStyle = (props, k, def) => ctx.getProperty(props, `style.${k}`, def);

    const startFeature = (props, fm) => {
        ctx.processStyle(props, new ctx.Transform(fm));
    };

    const endFeature = () => {
        ctx.emit('restore');
    };

    const textedLine = (coordinates, props, fm) => {
        const T = new ctx.Transform(fm);
        ctx.lineProject(coordinates);
        ctx.drawTextOnLine(T, coordinates,
            getParameter(props, 'text'),
            getParameter(props, 'fontsize'));
    };

    ctx.startFrame = (startedWith, opt_extent, opt_matrix, features) => {
        currentExtent = new ctx.Geometry.Extent(opt_extent);
        currentTransform = new ctx.Transform(opt_matrix);

        const poly = currentExtent.toPolygon().getCoordinates();
        ctx.polygonProject(poly);
        ctx.polygonTransform(currentTransform, poly);
        const tpoly = new ctx.Geometry.Polygon(poly);
        viewport = tpoly.getExtent();
        ctx.emit('clearRect', viewport.getCoordinates());
        ctx.emit('clip', 'begin', tpoly.getCoordinates());
        textures = {};
    };


    ctx.linestring = (coordinates, props, fm) => {
        startFeature(props, fm);
        const txt = getParameter(props, 'text');
        if (txt) {
            textedLine(coordinates, props, fm);
        }
        else {
            const T = new ctx.Transform(fm);
            ctx.lineProject(coordinates);
            ctx.lineTransform(T, coordinates);
            const extent = (new ctx.Geometry.LineString(coordinates)).getExtent();
            if ((extent.getHeight() > 1) || (extent.getWidth() > 1)) {
                ctx.emit('draw', 'line', coordinates);
            }
        }
        endFeature();
    };

    const addTexture = (tkey, extent, props) => {
        const bviewport = viewport.clone().maxSquare().buffer(viewport.getWidth() * 0.7);
        const center = viewport.getCenter();
        const height = extent.getHeight();
        const paramHN = getParameter(props, 'hn', 24);
        let hatchLen = Math.floor((bviewport.getHeight() * paramHN) / height);
        const bottomLeft = bviewport.getBottomLeft().getCoordinates();
        const topRight = bviewport.getTopRight().getCoordinates();
        const start =  bottomLeft[1];
        const left = bottomLeft[0];
        const right = topRight[0];
        const patternCoordinates = [];
        const strokeColor = getStyle(props, 'strokeStyle', '#000');
        let step = Math.ceil(bviewport.getHeight() / hatchLen);
        const lineWidth = getStyle(props, 'lineWidth', 1);
        let turnFlag = false;
        const rotation = getParameter(props, 'rotation');
        const paramStep = getParameter(props, 'step');

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
            const rcoords = viewport.toPolygon().getCoordinates();
            ctx.emit('draw', 'polygon', rcoords, ['closePath', 'fill']);
        }
        else {
            ctx.processStyle(props, currentTransform);
            let y;
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
                const rt = new ctx.Transform();
                const ccoords = center.getCoordinates();
                rt.rotate(rotation, ccoords);
                ctx.lineTransform(rt, patternCoordinates);
            }

            ctx.emit('draw', 'line', patternCoordinates);
        }
        ctx.emit('endTexture');
        textures[tkey] = true;
    };

    const getTexture = (extent, props) => {
        const strokeColor = getStyle(props, 'strokeStyle', '#000');
        const lineWidth = getStyle(props, 'lineWidth', 1);
        const rotation = getParameter(props, 'rotation', 0);
        let paramHN = Math.floor((viewport.getHeight() * getParameter(props, 'hn', 24)) / extent.getHeight());
        let step = viewport.getHeight() / paramHN;
        let paramStep = getParameter(props, 'step');
        const hs = [];


        if (paramStep) {
            step = paramStep * currentTransform.getScale()[0];
            paramHN = 'n';
        }
        else {
            paramStep = 'n';
        }

        const ceiledStep = Math.ceil(step);

        hs.push(ceiledStep.toString());
        hs.push(strokeColor.toString());
        hs.push(lineWidth.toString());
        hs.push(rotation.toString());

        const tkey = hs.join('-');

        if (!(tkey in textures)) {
            const ts = Date.now();
            addTexture(tkey, extent, props);
            // logger('create texture', tkey, Object.keys(textures).length, Date.now() - ts);
        }
        return tkey;
    };

    const hatchedPolygon = (coordinates, props, fm) => {
        const T = new ctx.Transform(fm);
        ctx.polygonProject(coordinates);
        ctx.polygonTransform(T, coordinates);
        const p = new ctx.Geometry.Polygon(coordinates);
        const initialExtent = p.getExtent();
        const initialHeight = initialExtent.getHeight();
        const initialWidth = initialExtent.getWidth();

        if ((initialHeight < 1) || (initialWidth < 1)) {
            return;
        }

        const tkey = getTexture(initialExtent, props);

        ctx.emit('clip', 'begin', coordinates);
        ctx.emit('applyTexture', tkey);
        ctx.emit('clip', 'end');
    };

    const textedPolygon = (coordinates, props, fm) => {
        const T = new ctx.Transform(fm);
        ctx.polygonProject(coordinates);
        const p = new ctx.Geometry.Polygon(coordinates);
        const fs = getParameter(props, 'fontsize');
        if (fs) {
            ctx.drawTextInPolygon(T, p,
                getParameter(props, 'text'), fs);
        }
        else {
            ctx.drawTextInPolygonAuto(T, p,
                getParameter(props, 'text'));
        }
    };


    const imagedPolygon = (coordinates, img, props, fm) => {
        const T = new ctx.Transform(fm);
        ctx.polygonProject(coordinates);
        ctx.polygonTransform(T, coordinates);
        const p = new ctx.Geometry.Polygon(coordinates);
        const extent = p.getExtent().getArray();

        const options = {
            'image': img,
            'clip' : getParameter(props, 'clip', true),
            'adjust': getParameter(props, 'adjust', 'none'), // 'fit', 'cover'
            'rotation': getParameter(props, 'rotation', false)
        };

        ctx.emit('image', coordinates, extent, options);
    };

    ctx.polygon = (coordinates, props, fm) => {
        startFeature(props, fm);
        const img = getParameter(props, 'image');
        const txt = getParameter(props, 'text');
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

export default Program;
