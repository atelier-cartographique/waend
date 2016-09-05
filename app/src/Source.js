import _ from 'underscore';
import Geometry from '../lib/Geometry';
import {get as getBinder} from '../lib/Bind';
import BaseSource from './BaseSource';
import debug from 'debug';
const logger = debug('waend:Source');


const binder = getBinder();



class Source extends BaseSource{
    constructor (uid, gid, layer) {
        super();
        this.uid = uid;
        this.gid = gid;
        this.id = layer.id;
        this.layer = layer;

        // listen to the layer to update features if some are created
        layer.on('change', this.update, this);
        layer.on('set', function (key) {
            const prefix = _.first(key.split('.'));
            if (('style' === prefix) || ('params' === prefix)) {
                this.emit('update');
            }
        }, this);
    }


    update() {
        const emitUpdate = function () {
            const feat = this;
            this.emit('update:feature', feat);
        };

        binder.getFeatures(this.uid, this.gid, this.layer.id)
            .then(features => {
            const ts = _.now();
            this.clear();

            for (const feature of features) {
                this.addFeature(feature, true);
                feature.on('set set:data', emitUpdate);
            }

            this.buildTree();
            logger('END SOURCE UPDATE', features.length, _.now() - ts);
            this.emit('update');
        })
            .catch(err => {
                console.error('Source.update', err);
            });
    }

    toJSON(features=this.getFeatures()) {
        const a = new Array(features.length);
        const layerData = this.layer.getData();
        const layerStyle = layerData.style || {};
        const layerParams = layerData.params || {};

        for (let i = 0; i < features.length; i++) {
            const f = JSON.parse(features[i].toJSON());
            const props = f.properties;
            if ('style' in props) {
                _.defaults(props.style, layerStyle);
            }
            else {
                props.style = layerStyle;
            }
            if ('params' in props) {
                _.defaults(props.params, layerParams);
            }
            else {
                props.params = layerParams;
            }
            a[i] = f;
        }


        return a;
    }

}


//
// function str2ab(str) {
//   var buf = new ArrayBuffer(str.length*2); // 2 bytes for each char
//   var bufView = new Uint16Array(buf);
//   for (var i=0, strLen=str.length; i < strLen; i++) {
//     bufView[i] = str.charCodeAt(i);
//   }
//   return buf;
// }



export default Source;
