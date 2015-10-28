/*
 * app/lib/commands/widgets/ValueSelect.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */


var _ = require('underscore'),
    rbush = require('rbush'),
    O = require('../../../../lib/object').Object;


function Range (min, max, startPos, endPos) {
    this.min = min;
    this.max = max;
    this.startPos = startPos;
    this.endPos = endPos;
}

Range.prototype.draw = function (context) {
    var sp = this.startPos,
        ep = this.endPos;

    context.save();
    context.strokeStyle = 'blue';
    context.lineWidth = '6';
    context.moveTo(sp[0], sp[1]);
    context.lineTo(ep[0], ep[1]);
    context.restore();
};

Range.prototype.makeRange = function (val) {
    var max = this.max,
        min = this.min,
        interval = ((max - min) / 10) / 2,
        start = val - interval,
        end = val + interval,
        diff;

    if (start < min) {
        diff = min - start;
        start += diff;
        end += diff;
    }
    else if (end > max) {
        diff = end - max;
        start -= diff;
        end -= diff;
    }

    return [start, end];
};

Range.prototype.callback = function (pos, widget) {
    var x = pos[0],
        start = this.startPos[0],
        end = this.endPos[0];
    if (x < start) {
        widget.addRange(this.makeRange(this.min));
    }
    else if (x > end) {
        widget.addRange(this.makeRange(this.max));
    }
    else {
        var rg = end - start,
            d = x - start,
            val = (d / rg) * (this.max - this.min);
        widget.addRange(this.makeRange(val));
    }
};

function Value (val, pos, size) {
    this.value = val;
    this.pos = pos,
    this.size = size;
}

Value.prototype.draw = function (context) {

};


Value.prototype.callback = function (pos, widget) {
    widget.trigger('value', this.value);
};


var ValueSelect = O.extend({

    initialize: function (config) {
        Object.defineProperty(this, 'config', {'value': config});
        Object.defineProperty(this, 'controlSize', {'value': 12});

        this.ranges = [];
        this.controls = rbush();
    },

    getControls: function (pos) {
        var chs = this.controlSize / 2;
        var rect = [
            pos[0] - chs, pos[1] - chs,
            pos[0] + chs, pos[1] + chs
        ];

        var controls = this.controls.search(rect),
            indices = [];
        for (var i = 0, li = controls.length; i < li; i++) {
            indices.push(controls[i][4]);
        }
        return indices;
    },

    clickHandler: function (event) {
        var pos = [event.clientX, event.clientY],
            controls = this.getControls(pos);
        if (0 === controls.length) {
            return;
        }
        var control = controls[0];
        control.callback(pos, this);
    },

    build: function () {
        var container = this.config.container,
            width = this.config.width,
            height = this.config.height,
            min = this.config.min,
            max = this.config.max;

        var canvas = document.createElement('canvas');
        canvas.setAttribute('width', width);
        canvas.setAttribute('height', height);

        this.context = canvas.getContext('2d');
        this.canvas = canvas;
        this.addRange(min, max);

        container.appendChild(canvas);
    },

    addRange: function (min, max) {
        this.ranges.push([min, max]);
        this.tracesRanges();
    },

    traceRanges: function () {
        var context = this.context,
            canvas = context.canvas,
            ranges = this.ranges,
            width = this.config.width,
            height = this.config.height,
            startX = width * 0.2,
            endX = width * 0.8,
            yStep = height / ranges.length;

        canvas.clearRect(0, 0, width, height);
        this.controls.clear();

        for (var i = 0; i < ranges.length; i++) {
            var y = yStep + (yStep * i),
                r = ranges[i];

            var rv = new Range(r[0], r[1], [startX, y], [endX, y]);
            rv.draw(context);
            this.controls.insert([startX, y, endX, y, rv]);

        }

    }

});



module.exports = exports = ValueSelect;
