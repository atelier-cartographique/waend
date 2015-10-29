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
    O = require('../../../../lib/object').Object,
    helpers = require('../../helpers');

var copy = helpers.copy;

function Value (val, size, align) {
    this.value = val;
    this.size = size;
    this.align = align || 'center';
}

Value.prototype.setValue = function (val) {
    this.value = val;
    this.draw();
}

Value.prototype.draw = function (context, pos) {
    var extent;
    if (0 === arguments.length){
        if(!this.visualState) {
            throw (new Error('ValueDrawNoArgsNoState'));
        }
        pos = this.visualState.pos;
        context = this.visualState.context;
        extent = this.visualState.extent;
    }
    if (extent) {
        context.clearRect(
            extent[0], extent[1],
            extent[2] - extent[0], extent[3] - extent[1]
        );
    }

    var str = ' ' + this.value.toString() + ' ',
        x = pos[0],
        y = pos[1],
        align = this.align;

    context.save();
    context.fillStyle = '#0092FF';
    context.font = this.size +'px dauphine_regular';
    context.textAlign = align;
    context.fillText(str, x, y);

    // store text bounding box
    var metrics = context.measureText(str),
        minY = y - metrics.fontBoundingBoxAscent,
        maxY = y + metrics.fontBoundingBoxDescent;

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

    this.visualState = {
        extent: extent,
        context: context,
        pos: pos
    };
    //
    // context.strokeRect(
    //     extent[0], extent[1],
    //     extent[2] - extent[0], extent[3] - extent[1]
    // );

    context.restore();
};

Value.prototype.getControl = function () {
    var extent = this.visualState ? _.clone(this.visualState.extent) : [0,0,0,0];
    extent.push(this);
    return extent;
};


Value.prototype.callback = function (pos, widget) {
    widget.emit('value', this.value);
};


function Range (min, max) {
    this.min = min;
    this.max = max;
    this.value = min + Math.floor((max - min) / 2);
    this.thickness = 24;
    this.valueMin = new Value(min, this.thickness / 2);
    this.valueMax = new Value(max, this.thickness / 2);
    this.valueMiddle = new Value(this.value, this.thickness);
}


Range.prototype.setRange = function (min, max) {
    this.min = min;
    this.max = max;
    this.value = min + Math.floor((max - min) / 2);
    this.valueMin.setValue(this.min);
    this.valueMax.setValue(this.max);
    this.valueMiddle.setValue(this.value);
};

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
    return [c, cmin, cmid, cmax, this.movers[0], this.movers[1]];
};

Range.prototype.draw = function (context, startPos, endPos) {
    var sp = startPos,
        ep = endPos,
        mp = [
                startPos[0] + ((endPos[0] - startPos[0]) / 2),
                startPos[1]
            ];

    var thickness = this.thickness,
        ticks = [sp, mp, ep];
    context.save();
    context.strokeStyle = 'black';
    context.beginPath();
    _.each(ticks, function(t){
        context.moveTo(t[0], t[1]);
        context.lineTo(t[0], t[1] - thickness);
    });

    context.moveTo(sp[0], sp[1] - (thickness / 2));
    context.lineTo(ep[0], ep[1] - (thickness / 2));
    context.stroke();
    context.restore();

    this.extent = [sp[0], sp[1] - thickness, ep[0], ep[1]];
    this.context = context;

    this.drawMovers(context, startPos, endPos);

    sp[1] = sp[1] - (thickness * 1.3);
    ep[1] = ep[1] - (thickness * 1.3);
    mp[1] = mp[1] - (thickness * 1.3);

    this.valueMin.draw(context, sp);
    this.valueMiddle.draw(context, mp);
    this.valueMax.draw(context, ep);

};

Range.prototype.drawMovers = function (context, startPoint, endPoint) {
    var margin = 8,
        sz = this.thickness * 0.8,
        h = this.thickness,
        hh = h / 2,
        leftExtent, rightExtent;

    if (!this.movers) {
        var sp = copy(startPoint),
            ep = copy(endPoint);

        leftExtent = [
            sp[0] - (margin + sz), sp[1] - sz,
            sp[0] - margin, sp[1]
        ];
        rightExtent = [
            ep[0] + margin, ep[1] - sz,
            ep[0] + margin + sz, ep[1]
        ];

        var moverCb = function (isLeft) {
            return function () {
                var r = this.r,
                    itv = r.max - r.min;
                if (isLeft) {
                    r.setRange(r.min - itv, r.max - itv);
                }
                else {
                    r.setRange(r.min + itv, r.max + itv);
                }
                r.draw(context, copy(sp), copy(ep));
            };
        };

        var leftMover = {
            r: this,
            callback: moverCb(true)
        };
        var rightMover = {
            r: this,
            callback: moverCb(false)
        };
        leftExtent.push(leftMover);
        rightExtent.push(rightMover);
        this.movers = [leftExtent, rightExtent];

        context.beginPath();
        context.moveTo(sp[0] - margin, sp[1]);
        context.lineTo(sp[0] - (margin + sz), sp[1] - hh);
        context.lineTo(sp[0] - margin, sp[1] - h);
        context.closePath();
        context.stroke();

        context.beginPath();
        context.moveTo(ep[0] + margin, ep[1]);
        context.lineTo(ep[0] + (margin + sz), ep[1] - hh);
        context.lineTo(ep[0] + margin, ep[1] - h);
        context.closePath();
        context.stroke();
    }
};


Range.prototype.transition = function (pos) {
    var x = pos[0],
        val = this.valueAt(pos),
        range = this.makeRange(val),
        valMin = this.valueMin,
        valCen = this.valueMiddle,
        valMax = this.valueMax,
        self = this;

    // this.min = range[0];
    // this.max = range[1];
    // this.valueMin.setValue(this.min);
    // this.valueMax.setValue(this.max);
    // this.valueMiddle.setValue(Math.floor(val));

    var context = this.context,
        extent = this.extent,
        thickness = this.thickness,
        sp = [extent[0], extent[1]],
        ep = [extent[2], extent[3]],
        centerX = extent[0] + ((extent[2] - extent[0]) / 2),
        height = extent[3] - extent[1],
        centerY = extent[1] + (height / 2),
        baseY = extent[3],
        mp = pos,
        d0 = pos[0] - sp[0],
        d1 = centerX - pos[0],
        d2 = pos[0] - ep[0],
        duration = 450,
        start = null;

    var step = function (ts) {
        if (!start) {
            start = ts;
        }
        var elapsed = ts - start,
            remaining = duration - elapsed;
        context.clearRect(
            extent[0] - 1,
            extent[1] - 1,
            (extent[2] - extent[0]) + 2,
            (extent[3] - extent[1]) + 2
        );
        if (remaining < 0) {
            context.restore();
            self.min = range[0];
            self.max = range[1];
            self.value = Math.floor(val);
            valMin.setValue(self.min);
            valMax.setValue(self.max);
            valCen.setValue(self.value);
            self.draw(context, [extent[0], baseY], [extent[2], baseY]);
            return;
        }
        var s = elapsed / duration,
            r = remaining / duration,
            a = d0 * r,
            b = d1 * r,
            c = d2 * r;

        valMin.setValue(Math.floor(self.min + ((range[0] - self.min) * s)));
        valMax.setValue(Math.ceil(self.max - ((self.max - range[1]) * s)));
        valCen.setValue(Math.floor(self.value + ((val - self.value) * s)))

        var ticks = [
            // sp, [centerX, baseY], ep,
            [sp[0] + a, baseY],
            [centerX - b, baseY],
            [ep[0] + c, baseY]
        ];
        context.beginPath();
        _.each(ticks, function(t){
            context.moveTo(t[0], baseY);
            context.lineTo(t[0], baseY - height);
        });

        context.moveTo(sp[0], centerY);
        context.lineTo(ep[0], centerY);
        context.stroke();
        window.requestAnimationFrame(step);
    };
    context.save();
    context.strokeStyle = 'black';
    window.requestAnimationFrame(step);
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

Range.prototype.valueAt = function (pos) {
    var x = pos[0],
        start = this.extent[0],
        end = this.extent[2],
        val;
    if (x < start) {
        val = this.min;
    }
    else if (x > end) {
        val = this.max;
    }
    else {
        var rg = end - start,
            d = x - start;
        val = this.min + ((d / rg) * (this.max - this.min));
    }
    return val;
};

Range.prototype.callback = function (pos, widget) {
    var val = this.valueAt(pos),
        range = this.makeRange(val),
        itv = range[1] - range[0];
    if (itv > 6) {
        this.transition(pos);
    }
    else {
        widget.switchToSet(range);
    }
};


function Set (values) {
    this.values = values;
}

Set.prototype.getControls = function () {
    var ret = [];
    for(var i = 0; i < this.vw.length; i++) {
        ret.push(this.vw[i].getControl());
    }
    return ret;
};

Set.prototype.draw = function (context, startPos) {
    var values = this.values,
        valueWidgets = [],
        offset = 0,
        margin = 12,
        control;

    for (var i = 0; i < values.length; i++) {
        var w = new Value(values[i], 24, 'left');
        w.draw(context, [startPos[0] + offset, startPos[1]]);
        control = w.getControl();
        offset += (control[2] - control[0]) + margin;
        valueWidgets.push(w);
    }
    this.vw = valueWidgets;
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
    },

    switchToSet: function (range) {
        var context = this.context,
            canvas = context.canvas,
            ranges = this.ranges,
            width = this.config.width,
            height = this.config.height,
            startX = width * 0.2,
            endX = width * 0.8,
            yStep = height / (ranges.length + 1),
            values = _.range(range[0], range[1] + 1);

        context.clearRect(0, 0, width, height);
        this.controls.clear();

        var s = new Set(values);
        s.draw(context, [startX, height / 2]);
        this.controls.load(s.getControls());
    }

});



module.exports = exports = ValueSelect;
