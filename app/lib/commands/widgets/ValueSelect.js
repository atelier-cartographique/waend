/*
 * app/lib/commands/widgets/ValueSelect.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */


import _ from 'underscore';

import rbush from 'rbush';
import {Object as O} from '../../../../lib/object';
import {copy} from '../../helpers';
import Text from '../../../src/Text';
import Font from '../../../src/Font';

let font;

class Value {
    constructor(val, size, align) {
        this.value = val;
        this.size = size;
        this.align = align || 'center';
    }

    setValue(val) {
        this.value = val;
        this.draw();
    }

    draw(context, pos) {
        let extent;
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

        const str = ` ${this.value.toString()} `;
        const x = pos[0];
        const y = pos[1];
        const align = this.align;
        const text = new Text(str, font);
        const baseRect = text.getRect(pos, this.size);


        if ('left' !== align) {
            const width = baseRect[2] - baseRect[0];
            if ('center' === align) {
                baseRect[0] = baseRect[0] - (width / 2);
                baseRect[2] = baseRect[2] - (width / 2);
            }
            else if ('right' === align) {
                baseRect[0] = baseRect[0] - width;
                baseRect[2] = baseRect[2] - width;
            }
        }
        context.save();
        context.fillStyle = '#0092FF';
        // context.font = this.size +'px dauphine_regular';
        // context.textAlign = align;
        // context.fillText(str, x, y);
        text.drawOnCanvas(context, [baseRect[0], pos[1]], this.size);
        extent = baseRect;
        context.restore();

        this.visualState = {
            extent,
            context,
            pos
        };

        // context.strokeRect(
        //     extent[0], extent[1],
        //     extent[2] - extent[0], extent[3] - extent[1]
        // );
    }

    getControl() {
        const extent = this.visualState ? _.clone(this.visualState.extent) : [0,0,0,0];
        extent.push(this);
        return extent;
    }

    callback(pos, widget) {
        widget.emit('value', this.value);
    }
}

class Range {
    constructor(min, max) {
        this.min = min;
        this.max = max;
        this.value = min + Math.floor((max - min) / 2);
        this.thickness = 24;
        this.valueMin = new Value(min, this.thickness / 2);
        this.valueMax = new Value(max, this.thickness / 2);
        this.valueMiddle = new Value(this.value, this.thickness);
    }

    setRange(min, max) {
        this.min = min;
        this.max = max;
        this.value = min + Math.floor((max - min) / 2);
        this.valueMin.setValue(this.min);
        this.valueMax.setValue(this.max);
        this.valueMiddle.setValue(this.value);
    }

    getControl() {
        const extent = this.extent ? _.clone(this.extent) : [0,0,0,0];
        extent.push(this);
        return extent;
    }

    getControls() {
        const c = this.getControl();
        const cmin = this.valueMin.getControl();
        const cmid = this.valueMiddle.getControl();
        const cmax = this.valueMax.getControl();
        return [c, cmin, cmid, cmax, this.movers[0], this.movers[1]];
    }

    draw(context, startPos, endPos) {
        const sp = startPos;
        const ep = endPos;

        const mp = [
                startPos[0] + ((endPos[0] - startPos[0]) / 2),
                startPos[1]
            ];

        const thickness = this.thickness;
        const ticks = [sp, mp, ep];
        context.save();
        context.strokeStyle = 'black';
        context.beginPath();
        _.each(ticks, t => {
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
    }

    drawMovers(context, startPoint, endPoint) {
        const margin = 8;
        const sz = this.thickness * 0.8;
        const h = this.thickness;
        const hh = h / 2;
        let leftExtent;
        let rightExtent;

        if (!this.movers) {
            const sp = copy(startPoint);
            const ep = copy(endPoint);

            leftExtent = [
                sp[0] - (margin + sz), sp[1] - sz,
                sp[0] - margin, sp[1]
            ];
            rightExtent = [
                ep[0] + margin, ep[1] - sz,
                ep[0] + margin + sz, ep[1]
            ];

            const moverCb = isLeft => function () {
                const r = this.r;
                const itv = r.max - r.min;
                if (isLeft) {
                    r.setRange(r.min - itv, r.max - itv);
                }
                else {
                    r.setRange(r.min + itv, r.max + itv);
                }
                r.draw(context, copy(sp), copy(ep));
            };

            const leftMover = {
                r: this,
                callback: moverCb(true)
            };
            const rightMover = {
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
    }

    transition(pos, transitionEnd) {
        const x = pos[0];
        const val = this.valueAt(pos);
        const range = this.makeRange(val);
        const valMin = this.valueMin;
        const valCen = this.valueMiddle;
        const valMax = this.valueMax;
        const self = this;

        // this.min = range[0];
        // this.max = range[1];
        // this.valueMin.setValue(this.min);
        // this.valueMax.setValue(this.max);
        // this.valueMiddle.setValue(Math.floor(val));

        const context = this.context;

        const extent = this.extent;
        const thickness = this.thickness;
        const sp = [extent[0], extent[1]];
        const ep = [extent[2], extent[3]];
        const centerX = extent[0] + ((extent[2] - extent[0]) / 2);
        const height = extent[3] - extent[1];
        const centerY = extent[1] + (height / 2);
        const baseY = extent[3];
        const mp = pos;
        const d0 = pos[0] - sp[0];
        const d1 = centerX - pos[0];
        const d2 = pos[0] - ep[0];
        const duration = 450;
        let start = null;

        const step = ts => {
            if (!start) {
                start = ts;
            }
            const elapsed = ts - start;
            const remaining = duration - elapsed;
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
                if (_.isFunction(transitionEnd)) {
                    transitionEnd();
                }
                return;
            }
            const s = elapsed / duration;
            const r = remaining / duration;
            const a = d0 * r;
            const b = d1 * r;
            const c = d2 * r;

            valMin.setValue(Math.floor(self.min + ((range[0] - self.min) * s)));
            valMax.setValue(Math.ceil(self.max - ((self.max - range[1]) * s)));
            valCen.setValue(Math.floor(self.value + ((val - self.value) * s)))

            const ticks = [
                // sp, [centerX, baseY], ep,
                [sp[0] + a, baseY],
                [centerX - b, baseY],
                [ep[0] + c, baseY]
            ];
            context.beginPath();
            _.each(ticks, t => {
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
    }

    makeRange(val) {
        const max = this.max;
        const min = this.min;
        const interval = ((max - min) / 10) / 2;
        let start = val - interval;
        let end = val + interval;
        let diff;

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
    }

    valueAt(pos) {
        const x = pos[0];
        const start = this.extent[0];
        const end = this.extent[2];
        let val;
        if (x < start) {
            val = this.min;
        }
        else if (x > end) {
            val = this.max;
        }
        else {
            const rg = end - start;
            const d = x - start;
            val = this.min + ((d / rg) * (this.max - this.min));
        }
        return val;
    }

    callback(pos, widget) {
        const val = this.valueAt(pos);
        const range = this.makeRange(val);
        const itv = range[1] - range[0];
        if (itv > 6) {
            this.transition(pos, () => {
                widget.emit('value', val);
            });
        }
        else {
            widget.switchToSet(range);
        }
    }
}

class Set {
    constructor(values) {
        this.values = values;
    }

    getControls() {
        const ret = [];
        for(let i = 0; i < this.vw.length; i++) {
            ret.push(this.vw[i].getControl());
        }
        return ret;
    }

    draw(context, startPos) {
        const values = this.values;
        const valueWidgets = [];
        let offset = 0;
        const margin = 12;
        let control;

        for (let i = 0; i < values.length; i++) {
            const w = new Value(values[i], 24, 'left');
            w.draw(context, [startPos[0] + offset, startPos[1]]);
            control = w.getControl();
            offset += (control[2] - control[0]) + margin;
            valueWidgets.push(w);
        }
        this.vw = valueWidgets;
    }
}

const ValueSelect = O.extend({

    initialize(config) {
        Object.defineProperty(this, 'config', {'value': config});
        Object.defineProperty(this, 'controlSize', {'value': 12});

        this.ranges = [];
        this.controls = rbush();
        this.isReady = false;
        Font.select('default', function (f) {
            font = f;
            this.isReady = true;
            this.emit('ready');
        }, this);
    },

    getControls(pos) {
        const chs = 0.5;
        const rect = [
            pos[0] - chs, pos[1] - chs,
            pos[0] + chs, pos[1] + chs
        ];

        const controls = this.controls.search(rect);
        const indices = [];
        for (let i = 0, li = controls.length; i < li; i++) {
            indices.push(controls[i][4]);
        }
        return indices;
    },

    clickHandler(event) {
        const pos = [event.offsetX, event.offsetY];
        const controls = this.getControls(pos);
        if (0 === controls.length) {
            return;
        }
        const control = controls[0];
        const callback = control.callback;
        callback.call(control, pos, this);
    },

    moveHandler(event) {
        const pos = [event.offsetX, event.offsetY];
        const controls = this.getControls(pos);
        if (0 === controls.length) {
            event.target.style.cursor = 'default';
        }
        else {
            event.target.style.cursor = 'pointer';
        }
    },

    getNode() {
        if (!this.canvas) {
            this.build();
        }
        return this.canvas;
    },

    build() {
        const width = this.config.width;
        const height = this.config.height;
        const min = this.config.min;
        const max = this.config.max;

        const canvas = document.createElement('canvas');
        canvas.setAttribute('width', width);
        canvas.setAttribute('height', height);

        this.context = canvas.getContext('2d');
        this.canvas = canvas;

        canvas.addEventListener('click',
                _.bind(this.clickHandler, this), false);
        canvas.addEventListener('mousemove',
                _.bind(this.moveHandler, this), false);

        if (this.isReady) {
            this.addRange(min, max);
        }
        else {
            this.once('ready', function () {
                this.addRange(min, max);
            }, this);
        }
    },

    addRange(min, max) {
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

    transitionRanges() {
        const self = this;
        const context = this.context;
        const canvas = context.canvas;
        const ranges = self.existingRanges;
        const width = this.config.width;
        const height = this.config.height;
        const startX = width * 0.2;
        const endX = width * 0.8;
        let yStep = height / (ranges.length + 1);
        const nextYStep = height / (ranges.length + 2);
        const start = null;
        const animStep = 1;

        const step = ts => {
            if (yStep > nextYStep) {
                yStep -= animStep;
                context.clearRect(0, 0, width, height);

                for (const r of ranges) {
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

    traceRanges() {
        const context = this.context;
        const canvas = context.canvas;
        const ranges = this.ranges;
        const width = this.config.width;
        const height = this.config.height;
        const startX = width * 0.2;
        const endX = width * 0.8;
        const yStep = height / (ranges.length + 1);

        context.clearRect(0, 0, width, height);
        this.controls.clear();
        this.existingRanges = [];

        for (const r of ranges) {
            const rv = new Range(r[0], r[1]);
            rv.draw(context, [startX, y], [endX, y]);
            _.each(rv.getControls(), function (control) {
                this.controls.insert(control);
            }, this);
            this.existingRanges.push(rv);
        }
    },

    switchToSet(range) {
        const context = this.context;
        const canvas = context.canvas;
        const ranges = this.ranges;
        const width = this.config.width;
        const height = this.config.height;
        const startX = width * 0.2;
        const endX = width * 0.8;
        const yStep = height / (ranges.length + 1);
        const values = _.range(range[0], range[1] + 1);

        context.clearRect(0, 0, width, height);
        this.controls.clear();

        const s = new Set(values);
        s.draw(context, [startX, height / 2]);
        this.controls.load(s.getControls());
    }

});



export default ValueSelect;
