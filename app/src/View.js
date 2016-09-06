/*
 * app/src/View.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */

// 'use strict';


import _ from 'underscore';

import semaphore from '../lib/Semaphore';
import Geometry from '../lib/Geometry';
import Transform from '../lib/Transform';
import region from '../lib/Region';
import Navigator from './Navigator';
import debug from 'debug';
const logger = debug('waend:View');

const document = window.document;

class View {
    constructor(options) {
        this.root = options.root;
        this.map = options.map;
        this.extent = options.extent;
        this.transform = new Transform();
        this.layers = [];
        this.canvas = [];
        this.contexts = [];
        this.resize();

        this.navigator = new Navigator({
            'container': this.root,
            'map': this.map,
            'view': this
        });

        window.addEventListener('resize', _.bind(this.resize, this));
        semaphore.on('map:resize', this.resize.bind(this));

    }

    resize() {
        const rect = this.getRect();
        this.size = _.pick(rect, 'width', 'height');
        this.setTransform();

        for (const canvas of this.canvas) {
            canvas.width = rect.width;
            canvas.height = rect.height;
        }

        if (this.navigator) {
            this.navigator.resize();
        }
        semaphore.signal('please:map:render');
        semaphore.signal('view:resize', this);
    }

    getRect() {
        return this.root.getBoundingClientRect();
    }

    translate(dx, dy) {
        this.transform.translate(dx, dy);
        return this;
    }

    scale(sx, sy) {
        this.transform.translate(sx, sy);
        return this;
    }

    setExtent(extent) {
        const rect = this.getRect();
        const sx = rect.width / Math.abs(extent.getWidth());
        const sy = rect.height / Math.abs(extent.getHeight());
        const s = (sx < sy) ? sx : sy;
        const center = extent.getCenter().getCoordinates();
        if (sx < sy) {
            // adjust extent height
            const newHeight = rect.height * (1/s);

            const adjH = newHeight / 2;
            extent.extent[1] = center[1] - adjH;
            extent.extent[3] = center[1] + adjH;
        }
        else {
            // adjust extent width
            const newWidth = rect.width * (1/s);

            const adjW = newWidth / 2;
            extent.extent[0] = center[0] - adjW;
            extent.extent[2] = center[0] + adjW;
        }
        this.extent = extent;
        this.setTransform();
        semaphore.signal('view:change', this);
    }

    setTransform() {
        const extent = this.extent;
        const rect = this.getRect();
        const targetCenter = [rect.width / 2, rect.height / 2];
        const sourceCenter = extent.getCenter().getCoordinates();
        const sx = rect.width / Math.abs(extent.getWidth());
        const sy = rect.height / Math.abs(extent.getHeight());
        const s = (sx < sy) ? sx : sy;
        const trX = (targetCenter[0] - sourceCenter[0]) * s;
        const trY = (targetCenter[1] - sourceCenter[1]) * s;
        const axis = [targetCenter[0], targetCenter[1]];

        const t = new Transform();
        t.translate(trX , -trY);
        t.scale(s, -s, axis);
        logger('center',
                targetCenter, t.mapVec2(sourceCenter));
        this.transform.reset(t);
    }

    getGeoExtent(projection) {
        const pWorld = region.getWorldExtent().getCoordinates();
        const minPWorld = projection.forward([pWorld[0], pWorld[1]]);
        const maxPWorld = projection.forward([pWorld[2], pWorld[3]]);
        const pExtent = this.extent.bound(minPWorld.concat(maxPWorld));
        const projectedMin = pExtent.getBottomLeft().getCoordinates();
        const projectedMax = pExtent.getTopRight().getCoordinates();
        const min = projection.inverse(projectedMin);
        const max = projection.inverse(projectedMax);
        return min.concat(max);
    }

    getProjectedPointOnView(x, y) {
        const v = [x,y];
        const inv = this.transform.inverse();
        inv.mapVec2(v);
        return v;
    }

    getViewPointProjected(x, y) {
        const v = [x,y];
        this.transform.mapVec2(v);
        return v;
    }

    getLayer(layerId) {
        const idx = _.findIndex(this.layers, layer => layerId === layer.id);
        if (idx < 0) {
            return null;
        }
        return this.layers[idx];
    }

    getCanvas(layerId) {
        const idx = _.findIndex(this.canvas, cvns => layerId === cvns.id);
        if (idx < 0) {
            return null;
        }
        return this.canvas[idx];
    }

    getContext(layerId) {
        const idx = _.findIndex(this.contexts, ctx => layerId === ctx.id);
        if (idx < 0) {
            return null;
        }
        return this.contexts[idx];
    }

    getFeatures(extent) {
        let features = [];

        for (const lyr of this.layers) {
            if (fts) {
                features = features.concat(fts);
            }
        }

        return features;
    }

    createCanvas(layerId) {
        const canvas = document.createElement('canvas');
        const rect = this.getRect();

        canvas.id = layerId;
        canvas.width = rect.width;
        canvas.height = rect.height;
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.zIndex = -this.canvas.length;
        this.canvas.push(canvas);
        this.root.insertBefore(canvas, this.navigator.getNode());
        return canvas;
    }

    createContext(layerId, canvas) {
        const ctx = canvas.getContext('2d');
        ctx.id = layerId;
        // here should go some sort of init.

        this.contexts.push(ctx);
        return (this.contexts.length - 1);
    }

    addLayer(layer) {
        if (!this.navigator.isStarted) {
            this.navigator.start();
        }
        if(!!(this.getLayer(layer.id))){
            return;
        }
        const canvas = this.createCanvas(layer.id);
        const contextIndex = this.createContext(layer.id, canvas);
        this.layers.push(layer);
        return this;
    }

    removeLayer(layer) {
        if(!!(this.getLayer(layer.id))){
            this.layers = _.reject(this.layers, l => l.id === layer.id);
            this.contexts = _.reject(this.contexts, c => c.id === layer.id);

            const canvasElement = document.getElementById(layer.id);
            this.root.removeChild(canvasElement);
            this.canvas = _.reject(this.canvas, c => c.id === layer.id);
            return this;
        }
    }

    reorderLayers(ids) {
        const ll = this.layers.length;

        _.each(this.canvas, cnvs => {
            cnvs.style.zIndex = -ll;
        });

        for (let i = 0; i < ids.length; i++) {
            const id = ids[i];
            const cnvs = this.getCanvas(id);

            if (cnvs) {
                cnvs.style.zIndex = -i;
            }
        }

    }

    forEachImage(fn, ctx) {
        const rect = this.getRect();

        for (const source of this.contexts) {
            const img = source.getImageData(0, 0, rect.width, rect.height);
            // context.putImageData(img, 0, 0);
            fn.call(ctx, img);
        }
    }
}

export default View;
