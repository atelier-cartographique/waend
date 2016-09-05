import _ from 'underscore';
import semaphore from '../lib/Semaphore';
import Geometry from './Geometry';
import Projection from 'proj4';
import {Object as O} from '../../lib/object';


function fequals (a, b, p) {
    return (Math.abs(a - b) < p);
}

function maxVert () {
    const Proj3857 = Projection('EPSG:3857');
    let pt = [0, 0];
    let r;
    let ir;
    const INC = 0.1;

    let ret = 90;
    for (let i = 80; i < 90; i += INC) {
        pt = [180, i];
        r = Proj3857.forward(pt);
        ir = Proj3857.inverse(r);
        if (!fequals(ir[1], pt[1], INC)) {
            ret = i - INC;
            break;
        }
    }
    return ret
}

const horizMax = 180;
const vertiMax = maxVert();

const WORLD_EXTENT = new Geometry.Extent([-horizMax, -vertiMax, horizMax, vertiMax]);

const Region = O.extend({
    initialize() {
        this.state = [WORLD_EXTENT.clone()];
        semaphore.on('region:push', this.push, this);
    },

    getWorldExtent() {
        return WORLD_EXTENT.clone();
    },

    get() {
        return _.last(this.state).clone();
    },

    pop() {
        const extent = this.state.pop();
        this.emitChange(this.get());
        return this.get();
    },

    emitChange(extent) {
        semaphore.signal('region:change', extent, this);
    },

    pushExtent(extent) {
        this.state.push(extent.normalize());
        return this.emitChange(extent);
    },

    push(geom) {
        let extent;
        if (geom instanceof Geometry.Extent) {
            extent = geom.clone();
        }
        else if (geom instanceof Geometry.Geometry) {
            extent = geom.getExtent();
        }
        else if (_.isArray(geom)) { // we assume ol.extent type
            extent = new Geometry.Extent(geom);
        }
        else{
            extent = (new Geometry.Geometry(geom)).getExtent();
        }
        return this.pushExtent(extent);
    },

});

const region = new Region();

export default region;
