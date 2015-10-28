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


function Value (val, size) {
    this.value = val;
    this.size = size;
}

Value.prototype.draw = function (context, pos, align) {
    var str = ' ' + this.value.toString() + ' ',
        x = pos[0],
        y = pos[1];

    context.save();
    context.fillStyle = 'orange';
    context.font = this.size +'px monospace';
    context.textAlign = align || 'left';
    context.fillText(str, x, y);

    // store text bounding box
    var metrics = context.measureText(str),
        minY = y - metrics.fontBoundingBoxAscent,
        maxY = y + metrics.fontBoundingBoxDescent,
        extent;

    if ('center' === align) {
        var hw = metrics.width / 2;
        extent = [ x - hw, minY, x + hw, maxY ];
    }
    else if ('right' === align) {
        extent = [ x - metrics.width, minY, x , maxY ];
    }
    else { // left
        extent = [ x, minY, x + metrics.width, maxY ];
    }

    this.extent = extent;

    context.strokeRect(
        extent[0], extent[1],
        extent[2] - extent[0], extent[3] - extent[1]
    );

    context.restore();
};

Value.prototype.getControl = function () {
    var extent = this.extent ? _.clone(this.extent) : [0,0,0,0];
    extent.push(this);
    return extent;
};


Value.prototype.callback = function (pos, widget) {
    widget.emit('value', this.value);
};


function Range (min, max) {
    this.min = min;
    this.max = max;
    this.thickness = 24;
    this.valueMin = new Value(min, this.thickness);
    this.valueMax = new Value(max, this.thickness);
    var middleValue = min + Math.floor((max - min) / 2);
    this.valueMiddle = new Value(middleValue, this.thickness);
}

Range.prototype.getControl = function () {
    var extent = this.extent ? _.clone(this.extent) : [0,0,0,0];
    extent.push(this);
    return extent;
};

Range.prototype.getControls = function () {
    var c = this.getControl(),
        cmin = this.valueMin.getControl(),
        cmid = this.valueMiddle.getControl(),
        cmax = this.valueMax.getControl();
    return [c, cmin, cmid, cmax];
};

Range.prototype.draw = function (context, startPos, endPos) {
    var sp = startPos,
        ep = endPos,
        mp = [
                startPos[0] + ((endPos[0] - startPos[0]) / 2),
                startPos[1] - this.thickness
            ];

    var thickness = this.thickness;
    context.save();
    context.fillStyle = 'blue';
    context.beginPath();
    context.moveTo(sp[0], sp[1]);
    context.lineTo(ep[0], ep[1]);
    context.lineTo(ep[0], ep[1] - thickness);
    context.lineTo(sp[0], sp[1] - thickness);
    context.closePath()
    context.fill();
    context.restore();

    this.extent = [sp[0], sp[1] - thickness, ep[0], ep[1]];

    this.valueMin.draw(context, sp, 'right');
    this.valueMiddle.draw(context, mp, 'center');
    this.valueMax.draw(context, ep, 'left');
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

    return [Math.floor(start), Math.ceil(end)];
};

Range.prototype.callback = function (pos, widget) {
    var x = pos[0],
        start = this.extent[0],
        end = this.extent[2];
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



var ValueSelect = O.extend({

    initialize: function (config) {
        Object.defineProperty(this, 'config', {'value': config});
        Object.defineProperty(this, 'controlSize', {'value': 12});

        this.ranges = [];
        this.controls = rbush();
    },

    getControls: function (pos) {
        var chs = 0.5;
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
        var control = controls[0],
            callback = control.callback;
        callback.call(control, pos, this);
    },

    build: function (ender) {
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
        canvas.addEventListener('click',
                _.bind(this.clickHandler, this), false);

        this.on('value', function(v){
            ender(v);
        }, this);


    },

    addRange: function (min, max) {
        if (_.isArray(min)) {
            this.ranges.push(min);
        }
        else {
            this.ranges.push([min, max]);
        }
        if(this.ranges.length > 6) {
            this.ranges.shift();
        }
        if (this.existingRanges) {
            this.transitionRanges();
        }
        else {
            this.traceRanges();
        }
    },

    transitionRanges: function () {
        var self = this,
            context = this.context,
            canvas = context.canvas,
            ranges = self.existingRanges,
            width = this.config.width,
            height = this.config.height,
            startX = width * 0.2,
            endX = width * 0.8,
            yStep = height / (ranges.length + 1),
            nextYStep = height / (ranges.length + 2),
            start = null,
            animStep = 1;

        var step = function (ts) {
            if (yStep > nextYStep) {
                yStep -= animStep;
                context.clearRect(0, 0, width, height);
                for (var i = 0; i < ranges.length; i++) {
                    var y = yStep + (yStep * i),
                        r = ranges[i];
                    r.draw(context, [startX, y], [endX, y]);
                }
                window.requestAnimationFrame(step);
            }
            else {
                self.traceRanges();
            }
        };
        window.requestAnimationFrame(step);
    },

    traceRanges: function () {
        var context = this.context,
            canvas = context.canvas,
            ranges = this.ranges,
            width = this.config.width,
            height = this.config.height,
            startX = width * 0.2,
            endX = width * 0.8,
            yStep = height / (ranges.length + 1);

        context.clearRect(0, 0, width, height);
        this.controls.clear();
        this.existingRanges = [];

        for (var i = 0; i < ranges.length; i++) {
            var y = yStep + (yStep * i),
                r = ranges[i];

            var rv = new Range(r[0], r[1]);
            rv.draw(context, [startX, y], [endX, y]);
            _.each(rv.getControls(), function (control) {
                this.controls.insert(control);
            }, this);
            this.existingRanges.push(rv);
        }
    }

});



module.exports = exports = ValueSelect;
