/*
 * app/lib/Model.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */


import _ from 'underscore';
import EventEmitter from 'events';
import Geometry from './Geometry';

let binder;

function pathKey (obj, path, def) {
    path = path.split('.');
    for(let i = 0, len = path.length; i < len; i++){
        if (!obj || (typeof obj !== 'object')) {
            return def;
        }
        obj = obj[path[i]];
    }
    if (obj === undefined) {
        return def;
    }
    return obj;
}


export class Model extends EventEmitter {
    constructor(data) {
        super();
        this.data = data;
        Object.defineProperty(this, 'id', {value: data.id});

        // delay binder loading, ugly but still better than having
        // a refernce to it on each model.
        if(!binder) {
            const Bind = require('./Bind');
            binder = Bind.get();
        }
    }

    getPath() {
        return binder.getComps(this.id);
    }

    isNew() {
        return !('id' in this.data);
    }

    has(prop) {
        return (prop in this.data.properties);
    }

    get(key, def) {
        return pathKey(this.data.properties, key, def);
    }

    getData() {
        return JSON.parse(JSON.stringify(this.data.properties));
    }

    set(key, val) {
        const keys = key.split('.');
        const props = this.data.properties;
        if (1 === keys.length) {
            props[key] = val;
        }
        else {
            const kl = keys.length;
            let currentDict = props;
            let k;
            for (let i = 0; i < kl; i++) {
                k = keys[i];
                if ((i + 1) === kl) {
                    currentDict[k] = val;
                }
                else {
                    if (!(k in currentDict)) {
                        currentDict[k] = {};
                    }
                    else if (!_.isObject(currentDict[k])) {
                        currentDict[k] = {};
                    }
                    currentDict = currentDict[k];
                }
            }
        }
        this.emit('set', key, val);
        return binder.update(this);
    }

    setData(data) {
        this.data.properties = data;
        this.emit('set:data', data);
        return binder.update(this);
    }

    toJSON() {
        return JSON.stringify(this.data);
    }

    _updateData(data, silent) {
        const props = this.data.properties;
        const newProps = data.properties;
        const changedProps = [];
        const changedAttrs = [];
        const changedKeys = _.difference(_.keys(props), _.keys(newProps)).concat(_.difference(_.keys(newProps), _.keys(props)));

        _.each(props, (v, k) => {
            if (!_.isEqual(v, newProps[k])) {
                changedProps.push(k);
            }
        });

        _.each(this.data, (v, k) => {
            if ('properties' !== k) {
                if (!_.isEqual(v, data[k])) {
                    changedAttrs.push(k);
                }
            }
        });


        this.data = data;
        if (!silent
            && ((changedAttrs.length > 0)
                || (changedProps.length > 0)
                || (changedKeys.length > 0)) ) {
            this.emit('set:data', data);
            _.each(changedProps, function(k) {
                this.emit('set', k, data.properties[k]);
            }, this);
        }
    }

}


export default Model;

// models

export class User extends Model {
    get type () { return 'user'; }
}

export class Group extends Model {
    get type () { return 'group'; }
}

export class Layer  extends Model {
    get type () { return 'layer'; }

    getGroup () {
        const path = this.getPath();
        return binder.getGroup(...path);
    }

    isVisible () {
        const resolver = (yes, no) => {
            that.getGroup()
                .then(group => {
                    const visibleList = group.get('params.visible', null);
                    if (null === visible) {
                        return yes();
                    }
                    if (_.indexOf(visibleList, this.id) < 0) {
                        return no();
                    }
                    yes();
                })
                .catch(no);
        };
        return (new Promise(resolver));
    }

    setVisible(visible) {

    }

    groupIndex() {

    }

    setGroupIndex(idx) {

    }

}

export class Feature extends Model {
    get type () { return 'feature'; }

    getGeometry () {
        return (new Geometry.Geometry(this.data.geom));
    }

    getExtent () {
        return (new Geometry.Geometry(this.data.geom)).getExtent();
    }

    setGeometry (geom) {
        if (geom instanceof Geometry.Geometry) {
            this.data.geom = geom.toGeoJSON();
        }
        else {
            this.data.geom = geom;
        }
        this.emit('set', 'geom', this.getGeometry());
        return binder.update(this);
    }
}

export function configure (configurator) {
    configurator(User);
    configurator(Group);
    configurator(Layer);
    configurator(Feature);
}
