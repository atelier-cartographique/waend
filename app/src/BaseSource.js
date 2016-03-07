/*
 * app/src/BaseSource.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */

'use strict';


var _ = require('underscore'),
    rbush = require('rbush'),
    O  = require('../../lib/object'),
    Geometry = require('../lib/Geometry');

var BaseSource = O.Object.extend({
    constructor: function () {
        this.tree = rbush();
        this.index = {};
        O.Object.apply(this, arguments);
    },

    clear: function () {
        this.index = {};
        this.tree.clear();
    },

    addFeature: function (f) {
        var geom = f.getGeometry(),
            extent = geom.getExtent().getCoordinates();
        this.index[f.id] = f;
        extent.push(f.id);
        this.tree.insert(extent);
        this.emit('add', f);
    },

    removeFeature: function (id) {
        delete this.index[id];
        this.buildTree();
    },

    buildTree: function () {
        var _ts = _.now();
        var featureIds = Object.keys(this.index),
            flen = featureIds.length,
            items = [],
            feature, geom, extent;
        this.tree.clear();
        for (i = 0; i < flen; i++) {
            feature = this.index[featureIds[i]];
            geom = feature.getGeometry();
            extent = geom.getExtent().getCoordinates();
            items.push(extent.concat([feature.id]));
        }
        this.tree.load(items);
        console.log('buildTree', flen, _.now() - _ts);
    },

    getLength: function () {
        return Object.keys(this.index).length;
    },

    getFeatures: function (opt_extent) {
        var features = [], items, i;
        if (opt_extent) {
            if (opt_extent instanceof Geometry.Extent) {
                items = this.tree.search(opt_extent.extent);
            }
            else { // we assume [minx, miny, maxx, maxy]
                items = this.tree.search(opt_extent);
            }

            for (i = 0; i < items.length; i++) {
                var item = items[i];
                features.push(this.index[item[4]]);
            }
        }
        else {
            items = Object.keys(this.index);
            for (i = 0; i < items.length; i++) {
                features.push(this.index[items[i]]);
            }
        }
        return features;
    },

});


//
// function str2ab(str) {
//   var buf = new ArrayBuffer(str.length*2); // 2 bytes for each char
//   var bufView = new Uint16Array(buf);
//   for (var i=0, strLen=str.length; i < strLen; i++) {
//     bufView[i] = str.charCodeAt(i);
//   }
//   return buf;
// }



module.exports = exports = BaseSource;
