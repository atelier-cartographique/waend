/*
 * app/lib/commands/group/visible.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */


import _ from 'underscore';

import Promise from "bluebird";
import semaphore from '../../Semaphore';

class Lister {
    constructor(l=[]) {
        this._list = JSON.parse(JSON.stringify(l));
    }

    index(x) {
        return _.indexOf(this._list, x);
    }

    has(x) {
        return (this.index(x) > -1);
    }

    insert(idx, x) {
        if (this._list.length < idx) {
            this._list.push(x);
        }
        else {
            this._list.splice(idx, 0, x);
        }
    }

    at(idx) {
        return this._list[idx];
    }

    remove(x) {
        this._list = _.without(this._list, x);
    }

    swap(i0, i1) {
        const list = this._list;
        const tmp = list[i0];
        list[i0] = list[i1];
        list[i1] = tmp;
    }

    up(x) {
        const idx = this.index(x);
        const newIdx = idx + 1;
        if (idx < 0) {
            return;
        }
        if (newIdx >= this._list.length) {
            const list =  new Array(this._list.length);
            list[0] = this.at(this._list.length - 1);
            for (let i = 0; i < (this._list.length - 2); i++) {
                list[i+1] = this.at(i);
            }
            this._list = list;
        }
        else {
            this.swap(idx, newIdx);
        }
    }

    down(x) {
        // TODO
    }

    getList() {
        return JSON.parse(JSON.stringify(this._list));
    }
}

function listItem (layer, container, idx, lister) {
    const isVisible = lister.has(layer.id);
    const elem = document.createElement('div');
    const label = document.createElement('span');

    elem.setAttribute('class', `visible-layer visible-${isVisible ? 'yes' : 'no'}`);
    label.setAttribute('class', 'visible-layer-label');

    label.innerHTML = layer.get('name', layer.id);

    elem.appendChild(label);
    container.appendChild(elem);

    const toggle = () => {
        if (lister.has(layer.id)) {
            lister.remove(layer.id);
            elem.setAttribute('class', 'visible-layer visible-no');
        }
        else {
            lister.insert(idx, layer.id);
            elem.setAttribute('class', 'visible-layer visible-yes');
        }
        semaphore.signal('visibility:change', lister.getList());
    };

    elem.addEventListener('click', toggle, false);
}

function visible () {
    const self = this;
    const userId = self.getUser();
    const groupId = self.getGroup();

    const // this is a group
    data = self.data;

    const shell = self.shell;
    const stdout = self.sys.stdout;
    const binder = self.binder;
    const terminal = shell.terminal;
    const display = terminal.display();
    const wrapper = document.createElement('div');
    const list = document.createElement('div');
    const cancelButton = document.createElement('div');
    const submitButton = document.createElement('div');

    wrapper.setAttribute('class', 'visible-wrapper');
    list.setAttribute('class', 'visible-list');
    cancelButton.setAttribute('class', 'visible-cancel push-cancel');
    submitButton.setAttribute('class', 'visible-validate push-validate');
    submitButton.innerHTML = '<a>save</a>';
    cancelButton.innerHTML = '<a>close</a>';

    wrapper.appendChild(list);
    wrapper.appendChild(submitButton);
    wrapper.appendChild(cancelButton);
    display.node.appendChild(wrapper);

    const res = (resolve, reject) => {
        const vl = data.get('visible');
        const visibleLayers = new Lister(vl);
        const fv = !vl;

        const submit = () => {
            const vList = visibleLayers.getList();
            data.set('visible', vList);
            display.end();
            resolve(vList);
        };

        const close = () => {
            const vList = visibleLayers.getList();
            display.end();
            resolve(vList);
        };

        binder.getLayers(userId, groupId)
            .then(layers => {
                for(let i = 0; i < layers.length; i++){
                    const layer = layers[i];
                    if (fv) {
                        visibleLayers.insert(i, layer.id);
                    }
                    listItem(layer, list, i, visibleLayers);
                }
            })
            .catch(close);

        submitButton.addEventListener('click', submit, false);
        cancelButton.addEventListener('click', close, false);
    };
    return (new Promise(res));
}


export default {
    name: 'visible',
    command: visible
};
