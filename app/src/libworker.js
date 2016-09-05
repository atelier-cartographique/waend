/*
 * app/src/libworker.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */

import debug from 'debug';
const logger = debug('waend:libworker');

const workerContext = self;

//< OL3 helpers
workerContext.window = {
    'location' : workerContext.location
};
workerContext.window.document = {
    'implementation':{
        'createDocument'() { return true; }
    }
};
workerContext.document = workerContext.window.document;
workerContext.Image = function Image() {};

//> END OF OL3 helpers

import underscore from 'underscore';

import Geometry from '../lib/Geometry';
import Transform from '../lib/Transform';
import BaseSource from './BaseSource';
import Text from './Text';
import Projection from 'proj4';
import Turf from 'turf';

const Proj3857 = Projection('EPSG:3857');

const polygonProject = coordinates => {
    for (let i = 0; i < coordinates.length; i++) {
        const ringLength = coordinates[i].length;
        for (let ii = 0; ii < ringLength; ii++) {
            coordinates[i][ii] = Proj3857.forward(coordinates[i][ii]);
        }
    }
    return coordinates;
};

const lineProject = coordinates => {
    for (let i = 0; i < coordinates.length; i++) {
        coordinates[i] = Proj3857.forward(coordinates[i]);
    }
    return coordinates;
};


function floorVec2 (v) {
    v[0] = Math.floor(v[0]);
    v[1] = Math.floor(v[1]);
    return v;
}

const polygonTransform = (T, coordinates) => {
    for (let i = 0; i < coordinates.length; i++) {
        const ringLength = coordinates[i].length;
        for (let ii = 0; ii < ringLength; ii++) {
            coordinates[i][ii] = T.mapVec2(coordinates[i][ii]);
            // coordinates[i][ii] = floorVec2(T.mapVec2(coordinates[i][ii]));
        }
    }
    return coordinates;
};

const lineTransform = (T, coordinates) => {
    for (let i = 0; i < coordinates.length; i++) {
        coordinates[i] = T.mapVec2(coordinates[i]);
        // coordinates[i] = floorVec2(T.mapVec2(coordinates[i]));
    }
    return coordinates;
};

const polygonFloor = coordinates => {
    for (let i = 0; i < coordinates.length; i++) {
        const ringLength = coordinates[i].length;
        for (let ii = 0; ii < ringLength; ii++) {
            coordinates[i][ii] = floorVec2(coordinates[i][ii]);
            // coordinates[i][ii] = floorVec2(T.mapVec2(coordinates[i][ii]));
        }
    }
    return coordinates;
};

const lineFloor = coordinates => {
    for (let i = 0; i < coordinates.length; i++) {
        coordinates[i] = floorVec2(coordinates[i]);
        // coordinates[i] = floorVec2(T.mapVec2(coordinates[i]));
    }
    return coordinates;
};

let dataSource;
let renderId;

class GeomItem {
    constructor(data) {
        underscore.extend(this, data);
    }

    getGeometry() {
        return (new Geometry.Geometry(this.geom));
    }

    getExtent() {
        return (new Geometry.Geometry(this.geom)).getExtent();
    }
}

function initData (data) {
    dataSource = new BaseSource();
    for (let i = 0; i < data.length; i++) {
        const item = new GeomItem(data[i]);
        dataSource.addFeature(item, true);
    }
    dataSource.buildTree();
}

function updateData (featureData) {
    featureData = underscore.isArray(featureData) ?
                  featureData : [featureData];
    for (let i = 0; i < featureData.length; i++) {
        const feature = new GeomItem(featureData[i]);
        dataSource.removeFeature(feature.id);
        dataSource.addFeature(feature);
    }
}

function updateView (startedWith, opt_extent, opt_matrix) {
    const features = dataSource.getFeatures(opt_extent);
    if ('startFrame' in workerContext.waend) {
        workerContext.waend.startFrame(startedWith, opt_extent, opt_matrix, features);
    }
    const T = new Transform(opt_matrix);
    const rf = feature => {
        const geom = feature.getGeometry();
        const geomType = geom.getType().toLowerCase();
        const props = feature.properties;
        const coordinates = geom.getCoordinates();
        if (geomType && (geomType in workerContext.waend)) {
            // var rid = args[0];
            // logger('worker', renderId, rid, name);
            workerContext.waend[geomType].call(workerContext, coordinates, props, opt_matrix);
        }
    };


    const renderBatch = (start, stop) => {
        if (renderId !== startedWith) {
            return;
        }
        for (let j = start; j < stop; j++) {
            if (features[j]) {
                rf(features[j]);
            }
            else {
                return;
            }
        }
    };

    const batchLength = 512;
    if (renderId === startedWith) {
        for (let i = 0; i < features.length; i += batchLength) {
            const stop = Math.min(features.length, i + batchLength);
            if (!features[i] || !features[stop - 1]) {
                break;
            }
            underscore.defer(renderBatch, i, stop);
        }
    }
}


function messageHandler (event) {
    const data = event.data;
    const name = data.name;
    const args = data.args || [];
    if ('worker:render_id' === name) {
        renderId = args[0];
        logger('worker:render_id', renderId);
        workerContext.postMessage(['worker:render_id', renderId]);
    }
    else if ('init:data' === name) {
        initData(args[0]);
        logger('init:data', dataSource.getLength());
        workerContext.postMessage(['data:init']);
    }
    else if ('update:view' === name) {
        renderId = args[0];
        const localRenderId = renderId;
        // updateView(renderId, args[1], args[2]);
        underscore.defer(updateView, localRenderId, args[1], args[2]);
    }
    else if ('update:data' === name) {
        const featureData = args[0];
        updateData(featureData);
        workerContext.postMessage(['data:update']);
    }
}

workerContext.addEventListener('message', messageHandler, false);

function emit () {
    const args = [];

    if(0 === arguments.length) {
        return;
    }
    args.push(renderId);
    // args.push(arguments[0]);
    for (let i = 0; i < arguments.length; i++) {
        args.push(arguments[i]);
    }
    workerContext.postMessage(args);
}



/*

line intersect from paper.js
*/

function isZero (val) {
    return Math.abs(val) <= 1e-12;
}

function lineIntersect(apx, apy, avx, avy, bpx, bpy, bvx, bvy, asVector,
        isInfinite) {
    // Convert 2nd points to vectors if they are not specified as such.
    if (!asVector) {
        avx -= apx;
        avy -= apy;
        bvx -= bpx;
        bvy -= bpy;
    }
    const cross = avx * bvy - avy * bvx;
    // Avoid divisions by 0, and errors when getting too close to 0
    if (!isZero(cross)) {
        const dx = apx - bpx;
        const dy = apy - bpy;
        const ta = (bvx * dy - bvy * dx) / cross;
        const tb = (avx * dy - avy * dx) / cross;
        // Check the ranges of t parameters if the line is not allowed
        // to extend beyond the definition points.
        if (isInfinite || 0 <= ta && ta <= 1 && 0 <= tb && tb <= 1)
            return [apx + ta * avx, apy + ta * avy];
    }
}

function coordinatesLefter(a, b) {
  return (a[0] - b[0]);
}

function findIntersectSegment (coordinates, apx, apy, avx, avy) {
    const ret = [];
    let ring;
    let bpx;
    let bpy;
    let bvx;
    let bvy;
    let cv;
    let r;
    for (let i = 0; i < coordinates.length; i++) {
        ring = coordinates[i];
        for (let vi = 1; vi < ring.length; vi++) {
            bpx = ring[vi-1][0];
            bpy = ring[vi-1][1];
            bvx = ring[vi][0] - bpx;
            bvy = ring[vi][1] - bpy;
            r = lineIntersect(apx, apy, avx, avy, bpx, bpy, bvx, bvy, true, false);
            if (r) {
                ret.push(r);
            }
        }
    }
    ret.sort(coordinatesLefter);
    return ret;
}

function getWritableSegments (p, lineHeight, start) {
    const coordinates = p.getCoordinates();
    const extent = p.getExtent();
    const height = extent.getHeight();
    const width = extent.getWidth();
    const bottomLeft = extent.getBottomLeft().getCoordinates();
    const topRight = extent.getTopRight().getCoordinates();
    const left = bottomLeft[0];
    const right = topRight[0];
    const top = topRight[1];
    const segments = [];

    start = (start || 0) + 1;
    const offset = start * lineHeight;
    if(offset > height) {
        return null;
    }
    const intersections = findIntersectSegment(coordinates,
        left, top - offset, width, 0);
    for (let i = 1; i < intersections.length; i+=2) {
        segments.push([intersections[i-1], intersections[i]]);
    }

    return segments;
}


function transformCommand (instructions, transforms, cmd) {
    let tfn;
    let p0;
    let p1;
    let p2;

    if (!underscore.isArray(transforms)) {
        tfn = transforms;
    }
    else if (1 === transforms.length) {
        tfn = transforms[0];
    }
    else {
        tfn = underscore.compose(...transforms);
    }
    switch (cmd.type) {
        case 'M':
        instructions.push(['moveTo'].concat(tfn([cmd.x, cmd.y])));
        break;

        case 'L':
        instructions.push(['lineTo'].concat(tfn([cmd.x, cmd.y])));
        break;

        case 'C':
        p0 = tfn([cmd.x1, cmd.y1]);
        p1 = tfn([cmd.x2, cmd.y2]);
        p2 = tfn([cmd.x, cmd.y]);
        instructions.push(['bezierCurveTo',
                            p0[0], p0[1], p1[0], p1[1], p2[0], p2[1]]);
        break;

        case 'Q':
        p0 = tfn([cmd.x1, cmd.y1]);
        p1 = tfn([cmd.x, cmd.y]);
        instructions.push(['quadraticCurveTo',
                            p0[0], p0[1], p1[0], p1[1]]);
        break;

        case 'Z':
        instructions.push(['closePath']);
    }
}


function drawTextInPolygon (T, polygon, txt, fs) {
    let startSegment = 0;
    let segments = getWritableSegments(polygon, fs * 1.2, startSegment);
    const t = (txt instanceof Text) ? txt : (new Text(txt));
    let result;
    let cursor = t.cursor();
    let paths;
    let p;
    let cmd;
    const tfn = T.mapVec2Fn();
    const instructions = [];

    const proceed = () => {
        while (segments) {
            if( !cursor) {
                break;
            }
            if (segments.length > 0) {
                result = t.draw(fs, segments, cursor);
                cursor = result[0];
                paths = result[1];

                for (let i = 0; i < paths.length; i++) {
                    p = paths[i];
                    instructions.push(['beginPath']);
                    for (let ii = 0; ii < p.commands.length; ii++) {
                        transformCommand(instructions, [tfn], p.commands[ii]);
                    }
                    instructions.push(['fill']);
                }
            }
            startSegment += 1;
            segments = getWritableSegments(polygon, fs *  1.2, startSegment);
        }

        emit('instructions', instructions);
    };

    t.whenReady(proceed);
}

function vecDist (v1, v2) {
    const dx = v2[0] - v1[0];
    const dy = v2[1] - v1[1];
    return Math.sqrt((dx*dx) + (dy*dy));
}

/*
 * implements binary search (recursive)
 *
 * https://en.wikipedia.org/wiki/Binary_search_algorithm
 * Where it's different from general implementation lies in the fact
 * that's the predicate which evaluates rather then numeric comparision.
 * Thus the predicate must know the key.
 *
 * @param min Number minimum value
 * @param max Number maximun value
 * @predicate Function(pivot) a function that evaluates the current mid value a la compareFunction
 * @context Object context to which the predicate is applied
 *
 */
function binarySearch(min, max, predicate, context){
    const interval = max - min;
    const pivot = min + (Math.floor(interval/2));

    if (max === min) {
        return pivot;
    }
    else if(max < min){
        throw (new Error('MaxLowerThanMin'));
    }

    if(predicate.apply(context, [pivot]) > 0){
        return binarySearch(min, pivot, predicate, context);
    }
    else if(predicate.apply(context, [pivot]) < 0){
        return binarySearch(pivot + 1, max, predicate, context);
    }
    return pivot;
}

function drawTextInPolygonAuto (T, polygon, txt) {
    const basefs = 1;
    const highfs = 1000000;
    const t = (txt instanceof Text) ? txt : (new Text(txt));

    const segmentsLength = fs => {
        let start = 0;
        let segments = getWritableSegments(polygon, fs * 1.2, start);
        let totalLength = 0;
        while (segments) {
            for (let i = 0, sl = segments.length; i < sl; i++) {
                totalLength += vecDist(segments[i][0], segments[i][1]);
                // totalLength += Math.abs(segments[i][1][0] - segments[i][0][0]);
            }
            start += 1;
            segments = getWritableSegments(polygon, fs *  1.2, start);
        }
        return totalLength * (1 - (Math.log(fs) / 100));
    };

    const proceed = () => {
        const baseTextLength = t.getFlatLength(1);
        const predicate = pivot => {
            const sl = segmentsLength(pivot);
            const tl = baseTextLength * pivot;

            return Math.floor(tl - sl);
        };

        const fs = binarySearch(basefs, highfs, predicate);
        drawTextInPolygon(T, polygon, t, fs);
    };

    t.whenReady(proceed);
}



function lineAngle (start, end) {
    const d = [end[0] - start[0], end[1] - start[1]];
    const theta = Math.atan2(-d[1], d[0]) * 360.0 / 6.2831853071795;
    const theta_normalized = theta < 0 ? theta + 360 : theta;
    if(theta_normalized > 360){
        return 0;
    }
    return theta_normalized;
}



function drawTextOnLine (T, coordinates, txt, fsz) {
    const fs = fsz || 100;
    const startSegment = 0;
    const t = new Text(txt);
    let result;
    let cursor = t.cursor();
    const tfn = T.mapVec2Fn();
    let instructions = [];
    const segments = [];
    const tsc = T.getScale();
    const ttr = T.getTranslate();
    const TI = T.inverse();
    const tsi = TI.getScale();
    const translate = (new Transform()).translate(ttr[0] / tsc[0], ttr[1] / tsc[1]);
    const scale = (new Transform()).scale(tsc[0], tsc[1]);
    const translator = translate.mapVec2Fn('translate');
    const scalator = scale.mapVec2Fn('scale');
    const ident = (new Transform()).mapVec2Fn('identity');


    for (let lidx = 1; lidx < coordinates.length; lidx++) {
        const start = coordinates[lidx - 1];
        const end = coordinates[lidx];
        const seg = [start, end];

        segments.push(seg);
    }


    const proceed = () => {
        if (segments.length > 0) {
            const result = t.draw(fs, segments, cursor, true);
            const paths = result[1];
            let TT;
            let rotator;
            let angle;
            let p;
            let pos;

            cursor = result[0];

            for (let i = 0; i < paths.length; i++) {
                p = paths[i];
                instructions = [];
                // pos = [
                //     p.pos[0] + (ttr[0] / tsc[0]),
                //     p.pos[1] + (ttr[1] / tsc[1])
                // ];
                angle =  Math.abs(lineAngle(p.segment[0], p.segment[1])) * -1;

                TT = T.clone();
                TT.rotate(angle, p.pos);
                // emit('save');
                // emit.apply(self, ['transform'].concat(TT.flatMatrix()));

                instructions.push(['beginPath']);
                for (let ii = 0; ii < p.commands.length; ii++) {
                    transformCommand(instructions, TT.mapVec2Fn(), p.commands[ii]);
                    // transformCommand(instructions, [ident], p.commands[ii]);

                }
                instructions.push(['fill']);
                emit('instructions', instructions);
                // emit('restore');
            }
        }
    };

    t.whenReady(proceed);
}

function pathKey (obj, path, def) {
    path = path.split('.');
    for(let i = 0, len = path.length; i < len; i++){
        if (!obj || (typeof obj !== 'object')) {
            return def;
        }
        obj = obj[path[i]];
    }
    if (obj === undefined) {
        return def;
    }
    return obj;
}

function getProperty (props, key, def) {
    const val = pathKey(props, key, def);
    if (val
        && underscore.isString(val)
        && (val.length > 1)
        && ('@' === val[0])) {
        return pathKey(props, val.slice(1), def);
    }
    return val;
}

function processStyle (props, T) {
    const scale = T.getScale()[0];
    emit('save');
    if ('style' in props) {
        const style = props.style;
        let val;
        for (const k in style) {
            val = getProperty(props, `style.${k}`, null);
            if (val) {
                if (underscore.isNumber(val)) {
                    const tv = val * scale;
                    emit('set', k, tv);
                }
                else if ('dashLine' === k) {
                    const tv0 = val[0] * scale;
                    const tv1 = val[1] * scale;
                    emit('set', 'dashLine', [tv0, tv1]);
                }
                else {
                    emit('set', k, val);
                }
            }
        }
    }
}




workerContext.waend = {
    'Turf': Turf,
    'Projection': Projection,
    'Geometry': Geometry,
    'Transform': Transform,
    'proj3857': Proj3857,
    'polygonTransform' : polygonTransform,
    'lineTransform': lineTransform,
    'polygonProject': polygonProject,
    'lineProject': lineProject,
    'polygonFloor': polygonFloor,
    'lineFloor': lineFloor,
    'drawTextOnLine': drawTextOnLine,
    'drawTextInPolygon': drawTextInPolygon,
    'drawTextInPolygonAuto': drawTextInPolygonAuto,
    'emit': emit,
    'getProperty': getProperty,
    'processStyle': processStyle
};



// eof
