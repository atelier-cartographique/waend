/*
 * app/src/libworker_server.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */



var underscore = require('underscore'),
    Geometry = require('../app/lib/Geometry'),
    Transform = require('../app/lib/Transform'),
    BaseSource = require('../app/src/BaseSource'),
    Text = require('../app/src/Text'),
    Projection = require('proj4'),
    O = require('../lib/object').Object;

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



function GeomItem (data) {
    underscore.extend(this, data);
}

GeomItem.prototype.getGeometry = function () {
    return (new Geometry.Geometry(this.geom));
};

function initData (data) {
    this.dataSource = new BaseSource();
    for (var i = 0; i < data.length; i++) {
        var item = new GeomItem(data[i]);
        this.dataSource.addFeature(item);
    }
}

function updateView (startedWith, opt_extent, opt_matrix) {
    // console.log('updateView', startedWith, opt_extent, opt_matrix);
    if ('startFrame' in this) {
        this.startFrame(startedWith, opt_extent, opt_matrix);
    }
    var T = new Transform(opt_matrix);
    var rf = (function (feature) {
        var geom = feature.getGeometry(),
            geomType = geom.getType().toLowerCase(),
            props = feature.properties,
            coordinates = geom.getCoordinates();
        if (geomType && (geomType in this)) {
            this[geomType](coordinates, props, opt_matrix);
        }
    }).bind(this);

    var features = this.dataSource.getFeatures(opt_extent);
    for (var i = 0; i < features.length; i ++) {
        var f = features[i];
        rf(f);
    }
    // console.log('frame:end');
    underscore.delay(this.endFrame.bind(this), 5000);
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


function transformCommand (transforms, cmd) {

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

function drawTextInPolygon (T, polygon, txt, fs) {
    var startSegment = 0,
        segments = getWritableSegments(polygon, fs * 1.2, startSegment),
        t = (txt instanceof Text) ? txt : (new Text(txt)),
        result, tOffsets = [0,0],
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
                        instructions.push(transformCommand([tfn], p.commands[ii]));
                    }
                    instructions.push(['fill']);
                }
            }
            startSegment += 1;
            segments = getWritableSegments(polygon, fs *  1.2, startSegment);
        }

        this.emit('instructions', instructions);
    };

    t.whenReady(proceed.bind(this));
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
        this.drawTextInPolygon(T, polygon, t, fs);
    };

    t.whenReady(proceed.bind(this));
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
        t = new Text(txt), result, tOffsets = [0,0],
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
        ident = (new Transform()).mapVec2Fn();


    for (var lidx = 1; lidx < coordinates.length; lidx++) {
        var start = coordinates[lidx - 1],
            end = coordinates[lidx],
            seg = [start, end];

        segments.push(seg);
    }

    var proceed = function () {
        if (segments.length > 0) {
            var result = t.draw(fs, segments, tOffsets, true),
                paths = result[1],
                TT, rotator, angle, p, pos;

            tOffsets = result[0];

            for (var i = 0; i < paths.length; i++) {
                p = paths[i];
                instructions = [];
                pos = [
                    p.pos[0] + (ttr[0] / tsc[0]),
                    p.pos[1] + (ttr[1] / tsc[1])
                ];
                angle =  Math.abs(lineAngle(p.segment[0], p.segment[1])) * -1;
                TT = new Transform();
                TT.multiply(translate);
                TT.rotate(angle, pos);
                TT.multiply(scale);
                this.emit('save');
                this.emit.apply(this, ['transform'].concat(TT.flatMatrix()));
                instructions.push(['beginPath']);
                for (var ii = 0; ii < p.commands.length; ii++) {
                    instructions.push(transformCommand([ident], p.commands[ii]));

                }
                instructions.push(['fill']);
                this.emit('instructions', instructions);
                this.emit('restore');
            }
        }
    };
    t.whenReady(proceed.bind(this));
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
    this.emit('save');
    if ('style' in props) {
        var style = props.style, val;
        for (var k in style) {
            val = getProperty(props, 'style.'+k, null);
            if (val) {
                if (underscore.isNumber(val)) {
                    var tv = val * scale;
                    this.emit('set', k, tv);
                }
                else if ('dashLine' === k) {
                    var tv0 = val[0] * scale,
                        tv1 = val[1] * scale;
                    this.emit('set', 'dashLine', [tv0, tv1]);
                }
                else {
                    this.emit('set', k, val);
                }
            }
        }
        // underscore.each(style, function(value, key){
        //     emit('set', key, value);
        // });
    }
}

var WorkerContext = O.extend({

    initialize: function (channel) {
        this.channel = channel;
        this.renderId = null;
        this.dataSource = null;
        // channel.on('message', this.messageHandler, this);
    },

    messageHandler: function  (event) {
        try {
            var data = event.data,
                name = data.name,
                args = data.args || [];
            console.log('messageHandler', name);
            if ('worker:render_id' === name) {
                this.renderId = args[0];
                // console.log('worker:render_id', this.renderId);
                this.channel.onMessageHandler('worker:render_id', this.renderId);
            }
            else if ('init:data' === name) {
                this.initData(args[0]);
                // console.log('init:data', this.dataSource.getLength());
                O.prototype.emit.apply(this, ['data:init']);
            }
            else if ('update:view' === name) {
                this.renderId = args[0];
                var localRenderId = this.renderId;
                updateView.call(this, localRenderId, args[1], args[2]);
            }
        }
        catch (err) {
            O.prototype.emit.apply(this, ['error', err]);
        }
    },

    emit: function () {
        var args = [];

        if(0 === arguments.length) {
            return;
        }
        args.push(this.renderId);
        for (var i = 0; i < arguments.length; i++) {
            args.push(arguments[i]);
        }
        // O.prototype.emit.apply(this, ['message', args]);
        this.channel.onMessageHandler.apply(this.channel, args);
    },

    endFrame: function () {
        this.channel.onMessageHandler('frame:end');
    },

    'Projection': Projection,
    'Geometry': Geometry,
    'Transform': Transform,
    'proj3857': Proj3857,
    'polygonTransform' : polygonTransform,
    'lineTransform': lineTransform,
    'polygonProject': polygonProject,
    'lineProject': lineProject,
    'getProperty': getProperty,
    'initData': function(){ initData.apply(this, arguments); },
    'drawTextOnLine': function(){ drawTextOnLine.apply(this, arguments); },
    'drawTextInPolygon': function(){ drawTextInPolygon.apply(this, arguments); },
    'drawTextInPolygonAuto': function(){ drawTextInPolygonAuto.apply(this, arguments); },
    'processStyle': function(){ processStyle.apply(this, arguments); }
});

module.exports = exports = WorkerContext;

// eof
