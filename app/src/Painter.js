/*
 * app/src/Painter.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */

// 'use strict';


import _ from 'underscore';

import config from '../config';
import Geometry from '../lib/Geometry';
import semaphore from '../lib/Semaphore';
import debug from 'debug';
const logger = debug('waend:Painter');

const MEDIA_URL = config.public.mediaUrl;

class ImageLoader {
    constructor(painter) {
        this.painter = painter;
    }

    load(coordinates, extentArray, options) {
        const painter = this.painter;
        const img = document.createElement('img');
        const url = `${MEDIA_URL}/${options.image}`;
        const extent = new Geometry.Extent(extentArray);
        const width = extent.getWidth();
        const height = extent.getHeight();

        const complete = () => {
            if (this.cancelDrawing) {
                return;
            }

            // now we're supposed to have access to image size
            let imgWidth = img.naturalWidth;

            let imgHeight = img.naturalHeight;
            const sw = extent.getBottomLeft().getCoordinates();
            let scale;

            if ('none' === options.adjust) {
                imgWidth = width;
                imgHeight = height;
            }
            else if ('fit' === options.adjust) {
                scale = Math.min(width/imgWidth, height/imgHeight);
                imgWidth = imgWidth * scale;
                imgHeight = imgHeight * scale;
                if ((width - imgWidth) < (height - imgHeight)) {
                    sw[1] += (height - imgHeight) / 2;
                }
                else {
                    sw[0] += (width - imgWidth) / 2;
                }
            }
            else if ('cover' === options.adjust) {
                scale = Math.max(width/imgWidth, height/imgHeight);
                imgWidth = imgWidth * scale;
                imgHeight = imgHeight * scale;
                if ((width - imgWidth) > (height - imgHeight)) {
                    sw[1] += (height - imgHeight) / 2;
                }
                else {
                    sw[0] += (width - imgWidth) / 2;
                }
            }

            painter.save();
            if (options.clip) {
                painter.drawPolygon(coordinates, ['clip']);
            }
            if (options.rotation) {
                const rot = options.rotation * Math.PI / 180;
                const cx = sw[0] + (imgWidth / 2);
                const cy = sw[1] + (imgHeight / 2);

                painter.context.translate(cx, cy);
                painter.context.rotate(rot);
                painter.context.translate(-cx, -cy);
            }
            painter.context.drawImage(img, sw[0], sw[1], imgWidth, imgHeight);
            painter.restore();
        };

        const getStep = sz => {
            const steps = [ 4, 8, 16, 32, 64, 128, 256, 512, 1024 ];
            const sl = steps.length;
            for (let i = sl - 1; i >= 0; i--) {
                if (sz >= steps[i]) {
                    if (i < (sl - 1)){
                        return steps[i + 1];
                    }
                    return steps[i];
                }
            }
        };

        img.src = `${url}/${getStep(Math.max(width, height))}`;
        if (img.complete) {
            complete();
        }
        else {
            img.addEventListener('load', complete, false);
        }
    }

    cancel() {
        this.cancelDrawing = true;
    }
}

class Painter {
    constructor(view, layerId) {
        const baseContext = view.getContext(layerId);
        let currentContext = baseContext;

        Object.defineProperty(this, 'context', {
            get() {
                return currentContext;
            },

            set(ctx) {
                currentContext = ctx;
            }
        });

        this.restoreContext = () => {
            currentContext = baseContext;
        };

        this.transform = view.transform.clone();
        this.view = view;
        semaphore.on('view:change', this.resetTransform, this);
        this.stateInc = 0;
        this.imagesLoading = [];
        this.clear();

    }

    setTransform(a, b, c, d, e, f) {
        this.context.setTransform(a,b,c,d,e,f);
    }

    resetTransform() {
        const ctx = this.context;
        const view = this.view;
        const T = view.transform;
        this.transform = T.clone();
    }

    resetClip() {
        const ctx = this.context;
        const view = this.view;

        this.context.beginPath();
        this.context.rect(0, 0, view.size.width, view.size.height);
        this.context.clip();
    }

    clear() {
        while (this.stateInc > 0) {
            this.restore();
        }
        for (let i = 0; i < this.imagesLoading.length; i++) {
            this.imagesLoading[i].cancel();
        }
        this.imagesLoading = [];
        this.textures = {};
        this.resetTransform();
        this.resetClip();
        this.context.clearRect(0, 0, this.view.size.width, this.view.size.height);
        this.context.globalCompositeOperation = 'multiply';
    }

    clearRect(coordinates) {
        const extent = new Geometry.Extent(coordinates);
        const tl = extent.getBottomLeft().getCoordinates();
        this.context.clearRect(tl[0], tl[1],
            extent.getWidth(), extent.getHeight());
    }

    save() {
        this.context.save();
        this.stateInc += 1;
    }

    restore() {
        this.context.restore();
        this.stateInc -= 1;
    }

    wrap(f, ctx) {
        this.save();
        f.call(ctx, this);
        this.restore();
    }

    // graphic state
    set(prop, value) {
        if (this.context[prop]) {
            this.context[prop] = value;
        }
        else if ('lineDash' === prop) {
            this.context.setLineDash(value);
        }

    }

    // clipping
    clip(cmd, coordinates) {
        // logger('painter.clip', cmd, coordinates ? coordinates[0][0]: '-');
        if('end' === cmd) {
            this.restore();
            // this.resetClip();
        }
        else if('begin' === cmd) {
            this.save();
            this.drawPolygon(coordinates, ['clip']);
            // this.drawPolygon(coordinates, ['closePath', 'stroke']);
        }
    }

    startTexture(tid) {
        const canvas = document.createElement('canvas');
        canvas.width = this.context.canvas.width;
        canvas.height = this.context.canvas.height;
        const ctx = canvas.getContext('2d');
        ctx.textureId = tid;
        this.textures[tid] = {
            canvas,
            context: ctx
        };
        this.context = ctx;
    }

    endTexture() {
        this.restoreContext();
    }

    applyTexture(tid) {
        const canvas = this.textures[tid].canvas;
        this.context.drawImage(canvas, 0, 0);
    }

    drawPolygon(coordinates, ends=['closePath', 'stroke']) {
        this.context.beginPath();

        for (const ring of coordinates) {
            for(let ii = 0; ii < ring.length; ii++) {
                const p = ring[ii];
                if(0 === ii){
                    this.context.moveTo(p[0], p[1]);
                }
                else{
                    this.context.lineTo(p[0], p[1]);
                }
            }
        }

        for (let e = 0; e < ends.length; e++) {
            this.context[ends[e]]();
        }
    }

    image(coordinates, extentArray, options) {
        const loader = new ImageLoader(this);
        this.imagesLoading.push(loader);
        loader.load(coordinates, extentArray, options);
    }

    drawLine(coordinates) {
        // logger('painter.line', coordinates[0]);
        this.context.beginPath();
        for(let i = 0; i < coordinates.length; i++) {
            const p = coordinates[i];
            if(0 === i){
                this.context.moveTo(p[0], p[1]);
            }
            else{
                this.context.lineTo(p[0], p[1]);
            }
        }
        // this.context.closePath();
        this.context.stroke();
    }

    draw(instruction, coordinates, ends) {

        if ('polygon' === instruction) {
            this.drawPolygon(coordinates, ends);
        }
        else if ('line' === instruction) {
            this.drawLine(coordinates);
        }
        else {
            const args = _.toArray(arguments);
            const method = args.shift();
            if (method && (method in this.context)) {
                this.context[method](...args);
            }
        }

    }

    rawContext() {
        const args = _.toArray(arguments);
        const method = args.shift();
        let p0;
        let p1;
        let p2;

        switch (method) {
            case 'beginPath':
                this.context.beginPath();
                break;
            case 'moveTo':
                this.context.moveTo(...[args[0], args[1]]);
                break;
            case 'lineTo':
                this.context.lineTo(...[args[0], args[1]]);
                break;
            case 'bezierCurveTo':
                p0 = [args[0], args[1]];
                p1 = [args[2], args[3]];
                p2 = [args[4], args[5]];
                this.context.bezierCurveTo(p0[0], p0[1], p1[0], p1[1], p2[0], p2[1]);
                break;
            case 'quadraticCurveTo':
                p0 = [args[0], args[1]];
                p1 = [args[2], args[3]];
                this.context.quadraticCurveTo(p0[0], p0[1], p1[0], p1[1]);
                break;
            case 'closePath':
                this.context.closePath();
                break;
            case 'stroke':
                this.context.stroke();
                break;
            case 'fill':
                this.context.fill();
                break;
        }
    }

    processInstructions(instructions) {
        for (let i = 0; i < instructions.length; i++) {
            this.rawContext(...instructions[i]);
        }
    }

    get handlers () {
        return {
            'draw': 'draw',
            'set': 'set',
            'clip': 'clip',
            'context': 'rawContext',
            'image': 'image',
            'instructions': 'processInstructions',
            'save': 'save',
            'restore': 'restore',
            'transform': 'setTransform',
            'clear' : 'clear',
            'clearRect' : 'clearRect',
            'startTexture': 'startTexture',
            'endTexture': 'endTexture',
            'applyTexture': 'applyTexture'
        };
    }
}



export default Painter;
