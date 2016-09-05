import _ from 'underscore';
import region from '../lib/Region';
import Geometry from '../lib/Geometry';
import semaphore from '../lib/Semaphore';
import {get as getBinder} from '../lib/Bind';
import Source from './Source';


const binder = getBinder();


// declarations
class SourceProvider {
    constructor() {
        const self = this;
        self.layerSources = [];

        semaphore.on('shell:change:context', (ctxIndex, path) => {
            if (ctxIndex > 1) {
                self.currentPath = path;
                self.updateGroup(path[0], path[1]);
            }
        });
        semaphore.on('create:layer', () => {
            self.updateGroup(self.currentPath[0], self.currentPath[1], true);
        });
    }

    // implementations
    updateGroup(userId, groupId, opt_force) {
        const self = this;
        if (!opt_force && self.groupId === groupId) {
            return;
        }
        self.userId = userId;
        self.groupId = groupId;
        binder.getGroup(userId, groupId)
            .then(group => {
                self.group = group;
                self.loadLayers()
                    .then(() => {
                        self.updateLayers();
                        if (group.has('visible')) {
                            const layers = group.get('visible');
                            semaphore.once('layer:update:complete', () => {
                                semaphore.signal('visibility:change', layers);
                            });
                        }
                        semaphore.signal('source:change', self.getSources());
                    })
                    .catch(console.error.bind(console));
            });
    }

    clearLayers() {
        _.each(this.layerSources, layer => {
            layer.clear();
        }, this);
        this.layerSources = [];
    }

    updateLayers() {
        _.each(this.layerSources, layer => {
            layer.update();
        }, this);
    }

    loadLayers() {
        const self = this;
        self.group.once('set',key => {
            if ('visible' === key) {
                self.updateGroup(self.userId, self.groupId, true);
            }
        });

        return binder
            .getLayers(self.userId, self.groupId)
            .then(layers => {
                self.clearLayers();
                for (let lidx = 0; lidx < layers.length; lidx++) {
                    self.layerSources.push(new Source(self.userId, self.groupId, layers[lidx]));
                }
                return Promise.resolve();
            })
            .catch(console.error.bind(console));
    }

    getSources() {
        return this.layerSources;
    }
}

export default SourceProvider;
