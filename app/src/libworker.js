/*
 * app/src/libworker.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */


var workerContext = self;

//< OL3 helpers
workerContext.window = {
    'location' : workerContext.location
};
workerContext.window.document = {
    'implementation':{
        'createDocument': function () { return true; }
    }
};
workerContext.document = workerContext.window.document;
workerContext.Image = function Image() {};
//> END OF OL3 helpers

var underscore = require('underscore'),
    Geometry = require('../lib/Geometry'),
    Transform = require('../lib/Transform'),
    BaseSource = require('./BaseSource'),
    Text = require('./Text'),
    Projection = require('proj4'),
    Turf = require('turf');

var Proj3857 = Projection('EPSG:3857');

var polygonProject = function (coordinates) {
    for (var i = 0; i < coordinates.length; i++) {
        var ringLength = coordinates[i].length;
        for (var ii = 0; ii < ringLength; ii++) {
            coordinates[i][ii] = Proj3857.forward(coordinates[i][ii]);
        }
    }
    return coordinates;
};

var lineProject = function (coordinates) {
    for (var i = 0; i < coordinates.length; i++) {
        coordinates[i] = Proj3857.forward(coordinates[i]);
    }
    return coordinates;
};


function floorVec2 (v) {
    v[0] = Math.floor(v[0]);
    v[1] = Math.floor(v[1]);
    return v;
}

var polygonTransform = function (T, coordinates) {
    for (var i = 0; i < coordinates.length; i++) {
        var ringLength = coordinates[i].length;
        for (var ii = 0; ii < ringLength; ii++) {
            coordinates[i][ii] = T.mapVec2(coordinates[i][ii]);
            // coordinates[i][ii] = floorVec2(T.mapVec2(coordinates[i][ii]));
        }
    }
    return coordinates;
};

var lineTransform = function (T, coordinates) {
    for (var i = 0; i < coordinates.length; i++) {
        coordinates[i] = T.mapVec2(coordinates[i]);
        // coordinates[i] = floorVec2(T.mapVec2(coordinates[i]));
    }
    return coordinates;
};

var polygonFloor = function (coordinates) {
    for (var i = 0; i < coordinates.length; i++) {
        var ringLength = coordinates[i].length;
        for (var ii = 0; ii < ringLength; ii++) {
            coordinates[i][ii] = floorVec2(coordinates[i][ii]);
            // coordinates[i][ii] = floorVec2(T.mapVec2(coordinates[i][ii]));
        }
    }
    return coordinates;
};

var lineFloor = function (coordinates) {
    for (var i = 0; i < coordinates.length; i++) {
        coordinates[i] = floorVec2(coordinates[i]);
        // coordinates[i] = floorVec2(T.mapVec2(coordinates[i]));
    }
    return coordinates;
};

var dataSource;
var renderId;

function GeomItem (data) {
    underscore.extend(this, data);
}

GeomItem.prototype.getGeometry = function () {
    return (new Geometry.Geometry(this.geom));
};

GeomItem.prototype.getExtent = function () {
    return (new Geometry.Geometry(this.geom)).getExtent();
};

function initData (data) {
    dataSource = new BaseSource();
    for (var i = 0; i < data.length; i++) {
        var item = new GeomItem(data[i]);
        dataSource.addFeature(item, true);
    }
    dataSource.buildTree();
}

function updateData (featureData) {
    featureData = underscore.isArray(featureData) ?
                  featureData : [featureData];
    for (var i = 0; i < featureData.length; i++) {
        var feature = new GeomItem(featureData[i]);
        dataSource.removeFeature(feature.id);
        dataSource.addFeature(feature);
    }
}

function updateView (startedWith, opt_extent, opt_matrix) {
    var features = dataSource.getFeatures(opt_extent);
    if ('startFrame' in workerContext.waend) {
        workerContext.waend.startFrame(startedWith, opt_extent, opt_matrix, features);
    }
    var T = new Transform(opt_matrix);
    var rf = function (feature) {
        var geom = feature.getGeometry(),
            geomType = geom.getType().toLowerCase(),
            props = feature.properties,
            coordinates = geom.getCoordinates();
        if (geomType && (geomType in workerContext.waend)) {
            // var rid = args[0];
            // console.log('worker', renderId, rid, name);
            workerContext.waend[geomType].call(workerContext, coordinates, props, opt_matrix);
        }
    };


    var renderBatch = function (start, stop) {
        if (renderId !== startedWith) {
            return;
        }
        for (var j = start; j < stop; j++) {
            if (features[j]) {
                rf(features[j]);
            }
            else {
                return;
            }
        }
    };

    var batchLength = 512;
    if (renderId === startedWith) {
        for (var i = 0; i < features.length; i += batchLength) {
            var stop = Math.min(features.length, i + batchLength);
            if (!features[i] || !features[stop - 1]) {
                break;
            }
            underscore.defer(renderBatch, i, stop);
        }
    }
}


function messageHandler (event) {
    var data = event.data,
        name = data.name,
        args = data.args || [];
    if ('worker:render_id' === name) {
        renderId = args[0];
        console.log('worker:render_id', renderId);
        workerContext.postMessage(['worker:render_id', renderId]);
    }
    else if ('init:data' === name) {
        initData(args[0]);
        console.log('init:data', dataSource.getLength());
        workerContext.postMessage(['data:init']);
    }
    else if ('update:view' === name) {
        renderId = args[0];
        var localRenderId = renderId;
        // updateView(renderId, args[1], args[2]);
        underscore.defer(updateView, localRenderId, args[1], args[2]);
    }
    else if ('update:data' === name) {
        var featureData = args[0];
        updateData(featureData);
        workerContext.postMessage(['data:update']);
    }
}

workerContext.addEventListener('message', messageHandler, false);

function emit () {
    var args = [];

    if(0 === arguments.length) {
        return;
    }
    args.push(renderId);
    // args.push(arguments[0]);
    for (var i = 0; i < arguments.length; i++) {
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
    var cross = avx * bvy - avy * bvx;
    // Avoid divisions by 0, and errors when getting too close to 0
    if (!isZero(cross)) {
        var dx = apx - bpx,
            dy = apy - bpy,
            ta = (bvx * dy - bvy * dx) / cross,
            tb = (avx * dy - avy * dx) / cross;
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
    var ret = [], ring, bpx, bpy, bvx, bvy, cv, r;
    for (var i = 0; i < coordinates.length; i++) {
        ring = coordinates[i];
        for (var vi = 1; vi < ring.length; vi++) {
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
    var coordinates = p.getCoordinates(),
        extent = p.getExtent(),
        height = extent.getHeight(),
        width = extent.getWidth(),
        bottomLeft = extent.getBottomLeft().getCoordinates(),
        topRight = extent.getTopRight().getCoordinates(),
        left = bottomLeft[0],
        right = topRight[0],
        top = topRight[1],
        segments = [];

    start = (start || 0) + 1;
    var offset = start * lineHeight;
    if(offset > height) {
        return null;
    }
    var intersections = findIntersectSegment(coordinates,
        left, top - offset, width, 0);
    for (var i = 1; i < intersections.length; i+=2) {
        segments.push([intersections[i-1], intersections[i]]);
    }

    return segments;
}


function transformCommand (instructions, transforms, cmd) {
    var tfn, p0, p1, p2;

    if (!underscore.isArray(transforms)) {
        tfn = transforms;
    }
    else if (1 === transforms.length) {
        tfn = transforms[0];
    }
    else {
        tfn = underscore.compose.apply(underscore, transforms);
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
    var startSegment = 0,
        segments = getWritableSegments(polygon, fs * 1.2, startSegment),
        t = (txt instanceof Text) ? txt : (new Text(txt)),
        result, cursor = t.cursor(),
        paths, p, cmd,
        tfn = T.mapVec2Fn(),
        instructions = [];

    var proceed = function () {
        while (segments) {
            if( !cursor) {
                break;
            }
            if (segments.length > 0) {
                result = t.draw(fs, segments, cursor);
                cursor = result[0];
                paths = result[1];

                for (var i = 0; i < paths.length; i++) {
                    p = paths[i];
                    instructions.push(['beginPath']);
                    for (var ii = 0; ii < p.commands.length; ii++) {
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
    var dx = v2[0] - v1[0],
        dy = v2[1] - v1[1];
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
    var interval = max - min;
    var pivot = min + (Math.floor(interval/2));

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
    var basefs = 1, highfs = 1000000,
        t = (txt instanceof Text) ? txt : (new Text(txt));

    var segmentsLength = function (fs) {
        var start = 0,
            segments = getWritableSegments(polygon, fs * 1.2, start),
            totalLength = 0;
        while (segments) {
            for (var i = 0, sl = segments.length; i < sl; i++) {
                totalLength += vecDist(segments[i][0], segments[i][1]);
                // totalLength += Math.abs(segments[i][1][0] - segments[i][0][0]);
            }
            start += 1;
            segments = getWritableSegments(polygon, fs *  1.2, start);
        }
        return totalLength * (1 - (Math.log(fs) / 100));
    };

    var proceed = function () {
        var baseTextLength = t.getFlatLength(1);
        var predicate = function (pivot) {
            var sl = segmentsLength(pivot),
                tl = baseTextLength * pivot;

            return Math.floor(tl - sl);
        };

        var fs = binarySearch(basefs, highfs, predicate);
        drawTextInPolygon(T, polygon, t, fs);
    };

    t.whenReady(proceed);
}



function lineAngle (start, end) {
    var d = [end[0] - start[0], end[1] - start[1]],
        theta = Math.atan2(-d[1], d[0]) * 360.0 / 6.2831853071795,
        theta_normalized = theta < 0 ? theta + 360 : theta;
    if(theta_normalized > 360){
        return 0;
    }
    return theta_normalized;
}



function drawTextOnLine (T, coordinates, txt, fsz) {
    var fs = fsz || 100,
        startSegment = 0,
        t = new Text(txt),
        result, cursor = t.cursor(),
        tfn = T.mapVec2Fn(),
        instructions = [],
        segments = [],
        tsc = T.getScale(),
        ttr = T.getTranslate(),
        TI = T.inverse(),
        tsi = TI.getScale(),
        translate = (new Transform()).translate(ttr[0] / tsc[0], ttr[1] / tsc[1]),
        scale = (new Transform()).scale(tsc[0], tsc[1]),
        translator = translate.mapVec2Fn('translate'),
        scalator = scale.mapVec2Fn('scale'),
        ident = (new Transform()).mapVec2Fn('identity');


    for (var lidx = 1; lidx < coordinates.length; lidx++) {
        var start = coordinates[lidx - 1],
            end = coordinates[lidx],
            seg = [start, end];

        segments.push(seg);
    }


    var proceed = function () {
        if (segments.length > 0) {
            var result = t.draw(fs, segments, cursor, true),
                paths = result[1],
                TT, rotator, angle, p, pos;

            cursor = result[0];

            for (var i = 0; i < paths.length; i++) {
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
                for (var ii = 0; ii < p.commands.length; ii++) {
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
    for(var i = 0, len = path.length; i < len; i++){
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
    var val = pathKey(props, key, def);
    if (val
        && underscore.isString(val)
        && (val.length > 1)
        && ('@' === val[0])) {
        return pathKey(props, val.slice(1), def);
    }
    return val;
}

function processStyle (props, T) {
    var scale = T.getScale()[0];
    emit('save');
    if ('style' in props) {
        var style = props.style, val;
        for (var k in style) {
            val = getProperty(props, 'style.' + k, null);
            if (val) {
                if (underscore.isNumber(val)) {
                    var tv = val * scale;
                    emit('set', k, tv);
                }
                else if ('dashLine' === k) {
                    var tv0 = val[0] * scale,
                        tv1 = val[1] * scale;
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
