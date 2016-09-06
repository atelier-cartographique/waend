/*
 * app/src/Map.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */

// 'use strict';


import _ from 'underscore';

import proj4 from 'proj4';
import region from '../lib/Region';
import Geometry from '../lib/Geometry';
import semaphore from '../lib/Semaphore';
import Renderer from './Renderer';
import View from './View';
import Mutex from '../lib/Mutex';
import debug from 'debug';
const logger = debug('waend:Map');



class Map {
    constructor(options) {
        this.projection = proj4(options.projection || 'EPSG:3857');
        this.renderers = {};

        const viewOptions = _.extend({
            'map': this,
            'extent': this.projectedExtent(options.extent || region.get())
        },_.pick(options, 'root'));

        this.view = new View(viewOptions);
        this.listenToWaend();
    }

    listenToWaend() {
        semaphore.on('layer:layer:add', this.waendAddLayer.bind(this));
        semaphore.on('layer:layer:remove', this.waendRemoveLayer.bind(this));
        semaphore.on('please:map:render', this.render.bind(this));
        semaphore.on('region:change', this.waendUpdateExtent.bind(this));
        semaphore.on('visibility:change', this.setVisibility.bind(this));
    }

    unlistenToWaend() {
    }

    projectedExtent(extent) {
        const bl = this.projection.forward(extent.getBottomLeft().getCoordinates());
        const tr = this.projection.forward(extent.getTopRight().getCoordinates());
        const pr = [bl[0], bl[1], tr[0], tr[1]];
        return new Geometry.Extent(pr);
    }

    waendUpdateExtent(extent) {
        this.view.setExtent(this.projectedExtent(extent));
        this.render();
    }

    waendUpdateRegion() {
    }

    setVisibility(layerIds) {
        _.each(this.renderers, (rdr, id) => {
            const vs = rdr.isVisible();
            const ts = _.indexOf(layerIds, id) >= 0;
            if (ts !== vs) {
                rdr.setVisibility(ts);
                rdr.render();
            }
        });
        this.view.reorderLayers(layerIds);
    }

    render() {
        let isBackground = false;
        _.each(this.renderers, rdr => {
            rdr.render(isBackground);
            if (rdr.isVisible) {
                isBackground = false;
            }
        });
    }

    waendAddLayer(layer) {
        this.view.addLayer(layer);
        const renderer = new Renderer({
            'view': this.view,
            'projection': this.projection,
            'layer': layer
        });

        this.renderers[layer.id] = renderer;
        renderer.render();
    }

    waendRemoveLayer(layer) {
        this.renderers[layer.id].stop();
        delete this.renderers[layer.id];
        this.view.removeLayer(layer);
    }

    getCoordinateFromPixel(pixel) {
        const v = Array(...pixel);
        const inverse = this.view.transform.inverse();
        const tv = inverse.mapVec2(v);
        // logger('map.getCoordinateFromPixel', v, inverse.flatMatrix(), tv);
        return this.projection.inverse(tv);
    }

    getPixelFromCoordinate(coord) {
        const v = Array(...coord);
        const pv = this.projection.forward(v);
        const tv = this.view.transform.mapVec2(pv);
        return tv;
    }

    getView() {
        return this.view;
    }

    getFeatures(extent) {
        return this.view.getFeatures(extent);
    }
}

export default Map;
