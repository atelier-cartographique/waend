/*
 * app/src/Source.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */

'use strict';


var _ = require('underscore'),
    Geometry = require('../lib/Geometry'),
    Bind = require('../lib/Bind'),
    BaseSource = require('./BaseSource');


var binder = Bind.get();



var Source = BaseSource.extend({
    initialize: function (uid, gid, layer) {
        this.uid = uid;
        this.gid = gid;
        this.id = layer.id;
        this.layer = layer;

        // listen to the layer to update features if some are created
        layer.on('change', this.update, this);
    },


    update : function () {
        var self = this;
        var emitUpdate = function () {
            self.emit('update');
        };
        binder.getFeatures(self.uid, self.gid, self.layer.id)
            .then(function(features){
                var newSize = 0;
                for (var i = 0; i < features.length; i++) {
                    var feature = features[i];
                    var featureIsNew = !(feature.id in self.index);
                    if(featureIsNew){
                        feature.on('set set:data', emitUpdate);
                        self.addFeature(feature);
                        newSize += 1;
                    }
                }
                emitUpdate();
            })
            .catch(function(err){
                console.error('Source.update', err);
            });
    },

        toJSON : function () {
            var features = this.getFeatures(),
                a = new Array(features.length),
                layerData = this.layer.getData(),
                layerStyle = layerData.style || {};

            for (var i = 0; i < features.length; i++) {
                var f = JSON.parse(features[i].toJSON()),
                    props = f.properties;
                if ('style' in props) {
                    _.defaults(props.style, layerStyle);
                }
                else {
                    props.style = layerStyle;
                }
                a[i] = f;
            }


            return a;

        }

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



module.exports = exports = Source;
