import _ from 'underscore';
import semaphore from '../lib/Semaphore';
import Geometry from '../lib/Geometry';
import Region from '../lib/Region';
import Projection from 'proj4';
import W from './Worker';
import Painter from './Painter';
import debug from 'debug';
const logger = debug('waend:Renderer');

const Proj3857 = Projection('EPSG:3857');

/**
 *
 * options:
 * view => View
 * projection => {forward()}
 */
class CanvasRenderer {
    constructor(options) {
        this.id = _.uniqueId();
        this.layer = options.layer;
        this.view = options.view;
        this.proj = options.projection;
        this._visible = true;
        this.painter = new Painter(this.view, this.layer.id);
        this.initWorker();
        this.features = {};
        semaphore.on('map:update', this.render.bind(this));
    }

    setVisibility(v) {
        this._visible = !!v;
    }

    isVisible() {
        return this._visible;
    }

    getNewRenderId() {
        return (`${this.id}.${_.uniqueId()}`);
    }

    dispatch () {
        const painter = this.painter;
        const handlers = painter.handlers;
        const revent = arguments[0];
        const args = [];

        if (revent in handlers) {
            for (let i = 1; i < arguments.length; i++) {
                args.push(arguments[i]);
            }
            painter[handlers[revent]](...args);
        }
    }

    initWorker() {
        const self = this;
        const worker = new W(this.layer.getProgram());

        worker.start();
        this.layer.on('update', () => {
            worker.once('data:init', () => {
                this.render();
            });

            worker.post('init:data', this.layer.toJSON());
        });

        this.layer.on('update:feature', feature => {
            // const geom = feature.getGeometry();
            // const extent = geom.getExtent();
            worker.once('data:update', () => {
                logger('updatating feature');
                this.render();
            });
            logger('posting updated feature');
            worker.post('update:data', this.layer.toJSON([feature]));
        });


        worker.once('data:init', () => {
            this.isReady = true;
            if (this.pendingUpdate) {
                this.render();
            }
        }, this);
        const data = this.layer.toJSON();
        worker.post('init:data', data);
        this.worker = worker;
    }

    drawBackround() {
        const we = Region.getWorldExtent();
        const painter = this.painter;
        let tl = we.getTopLeft().getCoordinates();
        let tr = we.getTopRight().getCoordinates();
        let br = we.getBottomRight().getCoordinates();
        let bl = we.getBottomLeft().getCoordinates();
        const trans = this.view.transform.clone();

        tl = trans.mapVec2(Proj3857.forward(tl));
        tr = trans.mapVec2(Proj3857.forward(tr));
        br = trans.mapVec2(Proj3857.forward(br));
        bl = trans.mapVec2(Proj3857.forward(bl));

        const coordinates = [ [tl, tr, br, bl] ];

        painter.save();
        painter.set('strokeStyle', '#888');
        painter.set('lineWidth', '0.5');
        painter.set('fillStyle', '#FFF');
        painter.drawPolygon(coordinates, ['closePath', 'stroke', 'fill']);
        painter.restore();
    }

    render(isBackground) {
        if (!this.isVisible()) {
            this.painter.clear();
            return;
        }
        if (!this.isReady) {
            this.pendingUpdate = true;
            return;
        }
        const worker = this.worker;

        if (this.renderId) {
            const rid = this.renderId;
            worker.removeAllListeners(rid);
        }
        this.renderId = this.getNewRenderId();
        this.painter.clear();
        // if (isBackground) {
        //     this.drawBackround();
        // }

        // logger('RENDER START', this.renderId);
        const extent = this.view.getGeoExtent(this.proj);
        worker.on(this.renderId, this.dispatch.bind(this));
        worker.post('update:view', this.renderId,
                    extent, this.view.transform.flatMatrix());
        // }, this);

        // worker.post('worker:render_id', this.renderId);
    }

    stop() {
        this.worker.stop();
    }
}


export default CanvasRenderer;
