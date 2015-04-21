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
workerContext.window = {};
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
};

var lineProject = function (coordinates) {
    for (var i = 0; i < coordinates.length; i++) {
        coordinates[i] = Proj3857.forward(coordinates[i]);
    }
};


var polygonTransform = function (T, coordinates) {
    for (var i = 0; i < coordinates.length; i++) {
        var ringLength = coordinates[i].length;
        for (var ii = 0; ii < ringLength; ii++) {
            coordinates[i][ii] = T.mapVec2(coordinates[i][ii]);
        }
    }
};

var lineTransform = function (T, coordinates) {
    for (var i = 0; i < coordinates.length; i++) {
        coordinates[i] = T.mapVec2(coordinates[i]);
    }
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

function messageHandler (event) {
    var data = event.data,
        name = data.name,
        args = data.args || [];
    if (name && (name in workerContext.waend)) {
        workerContext.waend[name].apply(workerContext, args);
    }
}

workerContext.addEventListener('message', messageHandler, false);

function emit () {
    var args = [];

    if(0 === arguments.length) {
        return;
    }

    for (var i = 0; i < arguments.length; i++) {
        args.push(arguments[i]);
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


function transformCommand (tfn, cmd) {
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

}

workerContext.waend.drawTextInPolygon = drawTextInPolygon;





// eof
