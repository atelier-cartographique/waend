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
        this.features = [];
        O.Object.apply(this, arguments);
    },

    clear: function () {
        this.index = {};
        this.features = [];
        this.tree.clear();
    },

    addFeature: function (f, skipSpatialIndex) {
        this.features.push(f);
        this.index[f.id] = this.features.length - 1;
        if (!skipSpatialIndex) {
            var geom = f.getGeometry(),
                extent = _.assign({id: f.id}, geom.getExtent().getDictionary());
            this.tree.insert(extent);
        }
        this.emit('add', f);
    },

    removeFeature: function (id) {
        this.features.splice(this.index[id], 1);
        delete this.index[id];
        this.buildTree();
    },

    buildTree: function () {
        var _ts = _.now(), _ts2;
        var features = this.features,
            flen = features.length,
            items = [],
            feature, geom, extent;
        this.tree.clear();
        for (var i = 0; i < flen; i++) {
            feature = features[i];
            extent = _.assign({id: feature.id},
                                feature.getExtent().getDictionary());
            items.push(extent);
        }
        _ts2 = _.now() - _ts;
        this.tree.load(items);
        console.log('buildTree', flen, _ts2, _.now() - (_ts + _ts2));
    },

    getLength: function () {
        return this.features.length;
    },

    getFeature: function (id) {
        return this.features[this.index[id]];
    },

    getFeatures: function (opt_extent) {
        var features = [], items, i;
        if (opt_extent) {
            if (opt_extent instanceof Geometry.Extent) {
                items = this.tree.search(opt_extent.getDictionary());
            }
            else if (_.isArray(opt_extent)) { // we assume [minx, miny, maxx, maxy]
                items = this.tree.search(
                    (new Geometry.Extent(opt_extent)).getDictionary());
            }
            else { // proper rbush dictionary?
                items = this.tree.search(opt_extent);
            }

            for (i = 0; i < items.length; i++) {
                var item = items[i];
                features.push(
                    this.features[this.index[item.id]]
                );
            }
        }
        else {
            return this.features;
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
