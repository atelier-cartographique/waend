import _ from 'underscore';
import EventEmitter from 'events';
import Transport from './Transport';
import config from '../config';
import region from './Region';
import Geometry from './Geometry';
import {subscribe} from './Sync';
import semaphore from './Semaphore';
import {User, Group, Layer, Feature} from './Model';
import debug from 'debug';
const logger = debug('waend:Bind');


const API_URL = config.public.apiUrl;

/**
 * A Record in Database
 *
 * @param {object} model  A model
 * @param {Array}  comps  Paths components
 * @param {string} parent Parent Id
 */
function Record (model, comps, parent) {
    Object.defineProperty(this, 'model', {
        value: model
    });
    Object.defineProperty(this, 'comps', {
        value: Object.freeze(comps)
    });
    Object.defineProperty(this, 'parent', {
        value: parent
    });

    Object.freeze(this);
}

const db_store = {};
class DB extends EventEmitter {
    constructor (t) {
        super();
        this.transport = t;
    }

    get _db () {return db_store;}

    makePath (comps) {
        const cl = comps.length;
        if (1 === cl) {
            return `/user/${comps[0]}`;
        }
        else if (2 === cl) {
            return `/user/${comps[0]}/group/${comps[1]}`;
        }
        else if (3 === cl) {
            return `/user/${comps[0]}/group/${comps[1]}/layer/${comps[2]}`;
        }
        else if (4 === cl) {
            return `/user/${comps[0]}/group/${comps[1]}/layer/${comps[2]}/feature/${comps[3]}`;
        }
        throw (new Error('wrong number of comps'));
    }

    getParent (comps) {
        return _.last(comps, 2)[0];
    }

    record (comps, model) {
        let rec;
        if (model.id in this._db) {
            const oldRec = this._db[model.id];
            oldRec.model._updateData(model.data);
            rec = new Record(oldRec.model, oldRec.comps, this.getParent(comps));
        }
        else {
            rec = new Record(model, comps, this.getParent(comps));
        }
        this._db[model.id] = rec;
        return rec;
    }

    update (model) {
        const self = this;
        const db = this._db;
        const record = db[model.id];
        const path = this.makePath(record.comps);

        const resolver = (resolve, reject) => {
            self.transport
                .put(API_URL + path, {'body': model })
                    .then(() => {
                        db[model.id] = new Record(model, record.comps, record.parent);
                        resolve(model);
                    })
                    .catch(reject);
        };
        return (new Promise(resolver));
    }

    has (id) {
        return (id in this._db);
    }

    get (id) {
        return this._db[id].model;
    }

    del (id) {
        delete this._db[id];
    }

    getComps (id) {
        return _.clone(this._db[id].comps);
    }

    lookupKey (prefix) {
        const pat = new RegExp(`^${prefix}.*`);
        const result = [];
        _.each(this._db, function(val, key){
            if(key.match(pat)){
                result.push(this.get(key));
            }
        }, this);
        return result;
    }

    lookup (predicate) {
        const result = _.pluck(_.filter(this._db, predicate, this), 'model');
        return result;
    }
}


function objectifyResponse (response) {
    if('string' === typeof response) {
        try{
            return JSON.parse(response);
        }
        catch(err){
            console.error(err);
            throw (err);
        }
    }
    return response;
}

class Bind extends EventEmitter {

    constructor (options) {
        super();
        this.transport = new Transport();
        this.db = new DB(this.transport);
        this.featurePages = {};
        this._groupCache = {};

        semaphore.on('sync', (chan, cmd, data) => {
            if ('update' === cmd) {
                if (this.db.has(data.id)) {
                    const model = this.db.get(data.id);
                    model._updateData(data);
                }
            }
            else if ('create' === cmd) {
                var ctx = chan.type;
                if ('layer' === ctx) {
                    if (!this.db.has(data.id)) {
                        var layerId = chan.id;
                        const feature = new Feature(data);
                        const comps = this.getComps(layerId);
                        comps.push(feature.id);
                        const rec = this.db.record(comps, feature);
                        // logger('comps', comps, rec);
                        this.changeParent(layerId);
                    }
                }
            }
            else if ('delete' === cmd) {
                var ctx = chan.type;
                if ('layer' === ctx) {
                    const fid = data;
                    if (this.db.has(fid)) {
                        var layerId = chan.id;
                        this.db.del(fid);
                        this.changeParent(layerId);
                    }
                }
            }
        });
    }

    update (model) {
        return this.db.update(model);
    }

    changeParent (parentId) {
        if(this.db.has(parentId)){
            const parent = this.db.get(parentId);
            logger('binder.changeParent', parent.id);
            parent.emit('change');
        }
    }

    getMe () {
        const db = this.db;
        const binder = this;
        const pr = response => {
            const u = new User(objectifyResponse(response));
            db.record([u.id], u);
            return u;
        };

        const url = `${API_URL}/auth`;
        return this.transport.get(url, {parse: pr});
    }

    getComps (id) {
        return this.db.getComps(id);
    }

    getUser (userId) {
        const db = this.db;
        const path = `/user/${userId}`;
        const binder = this;

        if(db.has(userId)){
            return Promise.resolve(db.get(userId));
        }
        const pr = response => {
            const u = new User(objectifyResponse(response));
            db.record([userId], u);
            return u;
        };
        const url = API_URL+path;
        return this.transport.get(url, {parse: pr});
    }

    getGroup (userId, groupId) {
        const db = this.db;
        const binder = this;
        const path = `/user/${userId}/group/${groupId}`;
        if(db.has(groupId)){
            return Promise.resolve(db.get(groupId));
        }
        const pr = response => {
            const groupData = objectifyResponse(response);
            const g = new Group(_.omit(groupData.group, 'layers'));
            const layers = groupData.group.layers;

            db.record([userId, groupId], g);

            for (const layer of layers) {
                const l = new Layer(_.omit(layer, 'features'));
                db.record([userId, groupId, layer.id], l);

                for (const feature of layer.features) {
                    const f = new Feature(feature);
                    db.record([userId, groupId, layer.id, feature.id], f);
                }

                subscribe('layer', layer.id);
            }

            semaphore.signal('stop:loader');
            subscribe('group', groupId);
            return g;
        };
        const url = API_URL+path;
        semaphore.signal('start:loader', 'downloading map data');
        return this.transport.get(url, {parse: pr});
    }


    getGroups (userId) {
        const db = this.db;
        const binder = this;
        const path = `/user/${userId}/group/`;
        const gc = this._groupCache;

        const pr = response => {
            const data = objectifyResponse(response);

            const ret = [];

            for (const groupData of data.results) {
                if(db.has(groupData.id)){
                    ret.push(db.get(groupData.id));
                }
                else if (groupData.id in gc) {
                    ret.push(gc[groupData.id]);
                }
                else {
                    const g = new Group(groupData);
                    // we do not record here, it would prevent deep loading a group
                    // db.record(path+g.id, g);
                    gc[groupData.id] = g;
                    ret.push(g);
                }
            }

            return ret;
        };
        const url = API_URL + path;
        return this.transport.get(url, {parse: pr});
    }

    getLayer (userId, groupId, layerId) {
        const db = this.db;
        const binder = this;
        const path = `/user/${userId}/group/${groupId}/layer/${layerId}`;
        if(db.has(layerId)){
            return Promise.resolve(db.get(layerId));
        }
        const pr = response => {
            const l = new Layer(objectifyResponse(response));
            db.record([userId, groupId, layerId], l);
            return l;
        };
        const url = API_URL + path;
        return this.transport.get(url, {parse: pr});
    }

    getLayers (userId, groupId) {
        return Promise.resolve(this.db.lookup((rec, key) => rec.parent === groupId));
    }

    getFeature (userId, groupId, layerId, featureId) {
        const db = this.db;
        const binder = this;
        const path = `/user/${userId}/group/${groupId}/layer/${layerId}/feature/${featureId}`;
        if(db.has(featureId)){
            return Promise.resolve(db.get(featureId));
        }
        const pr = response => {
            const f = new Feature(objectifyResponse(response));
            db.record([userId, groupId, layerId, featureId], f);
            return f;
        };
        const url = API_URL + path;
        return this.transport.get(url, {parse: pr});
    }

    delFeature (userId, groupId, layerId, featureId) {
        const feature = this.db.get(featureId);
        const geom = feature.getGeometry();

        const path = `/user/${userId}/group/${groupId}/layer/${layerId}/feature.${geom.getType()}/${featureId}`;

        const url = API_URL + path;
        const db = this.db;
        const self = this;

        const pr = () => {
            db.del(featureId);
            self.changeParent(layerId);
        };

        return this.transport.del(url, {parse: pr});
    }

    getFeatures (userId, groupId, layerId, page) {
        return Promise.resolve(this.db.lookup((rec, key) => rec.parent === layerId));
    }


    setGroup (userId, data) {
        const db = this.db;
        const binder = this;
        const path = `/user/${userId}/group/`;

        const pr = response => {
            const g = new Group(objectifyResponse(response));
            db.record([userId, g.id], g);
            binder.changeParent(userId);
            return g;
        };

        const url = API_URL+path;
        return this.transport.post(url, {
            parse: pr,
            body: data
        });
    }

    setLayer (userId, groupId, data) {
        const db = this.db;
        const binder = this;
        const path = `/user/${userId}/group/${groupId}/layer/`;

        const pr = response => {
            const g = new Layer(objectifyResponse(response));
            db.record([userId, groupId, g.id], g);
            binder.changeParent(groupId);
            return g;
        };

        const url = API_URL+path;
        return this.transport.post(url, {
            parse: pr,
            body: data
        });
    }

    setFeature (userId, groupId, layerId, data, batch) {
        const db = this.db;
        const binder = this;
        const path = `/user/${userId}/group/${groupId}/layer/${layerId}/feature/`;

        const pr = response => {
            const f = new Feature(objectifyResponse(response));
            db.record([userId, groupId, layerId, f.id], f);
            if (!batch) {
                binder.changeParent(layerId);
            }
            return f;
        };

        const url = API_URL+path;
        return this.transport.post(url, {
            parse: pr,
            body: data
        });
    }


    attachLayerToGroup (guid, groupId, layerId) {
        const db = this.db;
        const binder = this;
        const path = `/user/${guid}/group/${groupId}/attach/`;

        const data = {
            'layer_id': layerId,
            'group_id': groupId
        };

        const url = API_URL+path;
        return this.transport.post(url, {
            'body': data
        });
    }

    detachLayerFromGroup (userId, groupId, layerId) {
        const path = `/user/${userId}/group/${groupId}/detach/${layerId}`;
        const url = API_URL + path;
        const db = this.db;
        const pr = () => {
            this.changeParent(groupId);
        };
        return this.transport.del(url, {parse: pr});
    }

    matchKeyAsync (prefix) {
        const res = this.db.lookupKey(prefix);
        if(res.length > 0){
            return Promise.resolve(res);
        }
        return Promise.reject('No Match');
    }

    matchKey (prefix) {
        return this.db.lookupKey(prefix);
    }
}

let bindInstance = null;

export function get() {
    if(!bindInstance){
        bindInstance = new Bind();
    }
    return bindInstance;
}
