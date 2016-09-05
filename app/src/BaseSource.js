import _ from 'underscore';
import rbush from 'rbush';
import EventEmitter from 'events';
import Geometry from '../lib/Geometry';
import debug from 'debug';
const logger = debug('waend:BaseSource');


class BaseSource extends EventEmitter {
    constructor() {
        super();
        this.tree = rbush();
        this.index = {};
        this.features = [];
    }

    clear() {
        this.index = {};
        this.features = [];
        this.tree.clear();
    }

    addFeature(f, skipSpatialIndex) {
        this.features.push(f);
        this.index[f.id] = this.features.length - 1;
        if (!skipSpatialIndex) {
            const geom = f.getGeometry();
            const extent = _.assign({id: f.id}, geom.getExtent().getDictionary());
            this.tree.insert(extent);
        }
        this.emit('add', f);
    }

    removeFeature(id) {
        this.features.splice(this.index[id], 1);
        delete this.index[id];
        this.buildTree();
    }

    buildTree() {
        const _ts = _.now();
        let _ts2;
        const features = this.features;
        const flen = features.length;
        const items = [];
        let feature;
        let geom;
        let extent;
        this.tree.clear();
        for (let i = 0; i < flen; i++) {
            feature = features[i];
            extent = _.assign({id: feature.id},
                                feature.getExtent().getDictionary());
            items.push(extent);
        }
        _ts2 = _.now() - _ts;
        this.tree.load(items);
        logger('buildTree', flen, _ts2, _.now() - (_ts + _ts2));
    }

    getLength() {
        return this.features.length;
    }

    getFeature(id) {
        return this.features[this.index[id]];
    }

    getFeatures(opt_extent) {
        const features = [];
        let items;
        let i;
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
                const item = items[i];
                features.push(
                    this.features[this.index[item.id]]
                );
            }
        }
        else {
            return this.features;
        }
        return features;
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



export default BaseSource;
