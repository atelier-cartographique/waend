import _ from 'underscore';
import ol from 'openlayers';
import Geometry from '../lib/Geometry';
import semaphore from '../lib/Semaphore';
import Renderer from './Renderer';
import Mutex from '../lib/Mutex';



class Map {
    constructor(options) {
        // better have a view that is prepared
        if(!('view' in options)){
            options.view = new ol.View({
                zoom: 0,
                center: [0,0],
                projection: 'EPSG:4326'
            });
        }

        ol.Map.call(this, options);
        this.renderer_ = new Renderer(this.viewport_, this);

        // listen to layer setup changes
        semaphore.on('layer:layer:add', this.waendAddLayer.bind(this));
        semaphore.on('layer:layer:remove', this.waendRemoveLayer.bind(this));

        semaphore.on('please:map:render', this.render.bind(this));

        // this.updateQueue = new Queue();
        this.updateMutex = new Mutex();

        this.once('moveend', function(){
            this.listenToWaend();
            // this.listenToMe();
        }, this);

        const select = new ol.interaction.Select();
        this.addInteraction(select);
        select.on('select', e => {
            if (e.target.getFeatures().getLength() > 0) {
                const fs = e.target.getFeatures().getArray();
                const f = fs[0];
                const path = `/${f.get('path').join('/')}`;
                const cl = `cc ${path}`;
                semaphore.signal('terminal:run', cl);
                semaphore.signal('terminal:run', 'get');
            }
        });
    }

    listenToWaend() {
        this.onChangeViewKey = this.on('moveend', this.waendUpdateRegion, this);
        this.onChangeRegionKey = semaphore.on('region:change', this.waendUpdateExtent.bind(this));
    }

    unlistenToWaend() {
        this.unByKey(this.onChangeViewKey);
        semaphore.off(this.onChangeRegionKey);
    }

    waendUpdateExtent(extent) {
        const view = this.getView();
        const size = this.getSize();

        this.updateMutex
            .get()
            .then(release => {
                view.fitExtent(extent.extent, size);
                release();
            })
            .catch(() => {});
    }

    waendUpdateRegion() {
        const view = this.getView();
        const extent = view.calculateExtent(this.getSize());

        this.updateMutex
            .get()
            .then(release => {
                semaphore.signal('region:push', extent);
                release();
            })
            .catch(() => {});
    }

    waendAddLayer(layer) {
        this.addLayer(layer);
    }

    waendRemoveLayer(layer) {
        this.removeLayer(layer);
    }
}

ol.inherits(Map, ol.Map);


export default Map;
