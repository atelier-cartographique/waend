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

    addFeature : function (f) {
        var geom = f.getGeometry(),
            extent = geom.getExtent();
        this.index[f.id] = f;
        extent.push(f.id);
        this.tree.insert(extent);
        // console.log('BaseSource.addFeature', f.id, Object.keys(this.index).length);
        this.emit('add', f);
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
