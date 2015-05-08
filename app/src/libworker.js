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
    Text = require('./Text'),
    Projection = require('proj4');

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


var polygonTransform = function (T, coordinates) {
    for (var i = 0; i < coordinates.length; i++) {
        var ringLength = coordinates[i].length;
        for (var ii = 0; ii < ringLength; ii++) {
            coordinates[i][ii] = T.mapVec2(coordinates[i][ii]);
        }
    }
    return coordinates;
};

var lineTransform = function (T, coordinates) {
    for (var i = 0; i < coordinates.length; i++) {
        coordinates[i] = T.mapVec2(coordinates[i]);
    }
    return coordinates;
};


workerContext.waend = {
    'Projection': Projection,
    'Geometry': Geometry,
    'Transform': Transform,
    'proj3857': Proj3857,
    'polygonTransform' : polygonTransform,
    'lineTransform': lineTransform,
    'polygonProject': polygonProject,
    'lineProject': lineProject
};

var renderId;

function messageHandler (event) {
    var data = event.data,
        name = data.name,
        args = data.args || [];
    if ('worker:render_id' === name) {
        // console.log('worker.renderId', args[0]);
        renderId = args[0];
    }
    else if (name && (name in workerContext.waend)) {
        var rid = args[0];
        // console.log('worker', renderId, rid, name);
        if (rid === renderId) {
            workerContext.waend[name].apply(workerContext, args.slice(1));
        }
    }
}

workerContext.addEventListener('message', messageHandler, false);

function emit () {
    var args = [];

    if(0 === arguments.length) {
        return;
    }
    args.push(arguments[0]);
    args.push(renderId);
    if(arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args.push(arguments[i]);
        }
    }
    workerContext.postMessage(args);
}

workerContext.waend.emit = emit;


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
        extent = p.getExtentObject(),
        height = extent.getHeight(),
        width = extent.getWidth(),
        bottomLeft = extent.getBottomLeft().getCoordinates(),
        topRight = extent.getTopRight().getCoordinates(),
        left = bottomLeft[0],
        right = topRight[0],
        top = topRight[1],
        segments = [];

    start = start || 0;
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


function transformCommand () {
    var transforms = [],
        cmd = arguments[arguments.length - 1],
        argMaxIdx = arguments.length - 1;

    for (var i = 0; i < argMaxIdx; i++) {
        transforms.push(arguments[i]);
    }

    var tfn = underscore.compose.apply(underscore, transforms);

    var p0, p1, p2;
    switch (cmd.type) {
        case 'M':
            return ['moveTo'].concat(tfn([cmd.x, cmd.y]));
        case 'L':
            return ['lineTo'].concat(tfn([cmd.x, cmd.y]));
        case 'C':
            p0 = tfn([cmd.x1, cmd.y1]);
            p1 = tfn([cmd.x2, cmd.y2]);
            p2 = tfn([cmd.x, cmd.y]);
            return ['bezierCurveTo', p0[0], p0[1], p1[0], p1[1], p2[0], p2[1]];
        case 'Q':
            p0 = tfn([cmd.x1, cmd.y1]);
            p1 = tfn([cmd.x, cmd.y]);
            return ['quadraticCurveTo', p0[0], p0[1], p1[0], p1[1]];
        case 'Z':
            return ['closePath'];
    }
}

function drawTextInPolygon (T, polygon, txt, fsz) {
    var fs = fsz || 100,
        startSegment = 0,
        segments = getWritableSegments(polygon, fs * 1.2, startSegment),
        t = new Text(txt), result, tOffsets = [0,0],
        paths, p, cmd,
        tfn = T.mapVec2Fn(),
        instructions = [];

    var proceed = function () {
        while (segments) {
            if( !tOffsets) {
                break;
            }
            if (segments.length > 0) {
                result = t.draw(fs, segments, tOffsets);
                tOffsets = result[0];
                paths = result[1];

                // for (var s = 0; s < segments.length; s++) {
                //     emit('draw', 'line', segments[s]);
                // }
                for (var i = 0; i < paths.length; i++) {
                    p = paths[i];
                    instructions.push(['beginPath']);
                    for (var ii = 0; ii < p.commands.length; ii++) {
                        instructions.push(transformCommand(tfn, p.commands[ii]));
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

workerContext.waend.drawTextInPolygon = drawTextInPolygon;


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
        t = new Text(txt), result, tOffsets = [0,0],
        paths, p, cmd, TT, tfnR, angle,
        tfn = T.mapVec2Fn(),
        instructions = [],
        segments = [],
        ts = T.getScale(),
        tsi = T.inverse().getScale();

    for (var lidx = 1; lidx < coordinates.length; lidx++) {
        var start = coordinates[lidx - 1],
            end = coordinates[lidx],
            seg = [start, end];

        segments.push(seg);
    }

    var proceed = function () {
        if (segments.length > 0) {
            result = t.draw(fs, segments, tOffsets, true);
            tOffsets = result[0];
            paths = result[1];

            for (var i = 0; i < paths.length; i++) {
                p = paths[i];
                angle = Math.alineAngle(p.segment[0], p.segment[1]);
                tfnR = (new Transform())
                            .rotate(angle, {x:p.pos[0], y:p.pos[1]})
                            .mapVec2Fn();
                // TT.rotate(p.segment.angle);
                // tfn = T.clone().multiply(p.segment.T).mapVec2Fn();
                // tfn = T.clone().multiply(TT).mapVec2Fn();
                instructions.push(['beginPath']);
                for (var ii = 0; ii < p.commands.length; ii++) {
                    instructions.push(transformCommand(tfn, tfnR, p.commands[ii]));
                }
                instructions.push(['fill']);
            }
        }
        emit('instructions', instructions);
    };

    t.whenReady(proceed);

}


workerContext.waend.drawTextOnLine = drawTextOnLine;



// eof
