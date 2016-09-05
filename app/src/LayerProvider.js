import _ from 'underscore';
import {Object as O} from '../../lib/object';
import Geometry from '../lib/Geometry';
import semaphore from '../lib/Semaphore';
import waendLayerProgram from './Program';



const LayerProvider = O.extend({

    initialize() {
        this.layers = [];
        semaphore.on('source:change', this.update, this);
    },

    clearLayers() {
        _.each(this.layers, layer => {
            semaphore.signal('layer:layer:remove', layer);
        }, this);
        this.layers = [];
    },

    addLayer(layerSource) {
        const programSrc = layerSource.layer.get('program');
        let program;
        if (programSrc) {
            program = new Function('ctx', programSrc);
        }
        else {
            program = waendLayerProgram;
        }
        layerSource.getProgram = () => program;
        this.layers.push(layerSource);
        semaphore.signal('layer:layer:add', layerSource);
    },

    update(sources) {
        semaphore.signal('layer:update:start', this);
        this.clearLayers();
        _.each(sources, function(source){
            this.addLayer(source);
        }, this);
        semaphore.signal('layer:update:complete', this);
    },


});


export default LayerProvider;
