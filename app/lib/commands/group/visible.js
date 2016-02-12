/*
 * app/lib/commands/group/visible.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */


var _ = require('underscore'),
    Promise = require("bluebird"),
    semaphore = require('../../Semaphore');

function Lister (l) {
    l = l || [];
    this._list = JSON.parse(JSON.stringify(l));
}

Lister.prototype.index = function (x) {
    return _.indexOf(this._list, x);
};

Lister.prototype.has = function (x) {
    return (this.index(x) > -1);
};

Lister.prototype.insert = function (idx, x) {
    if (this._list.length < idx) {
        this._list.push(x);
    }
    else {
        this._list.splice(idx, 0, x);
    }
};

Lister.prototype.at = function (idx) {
    return this._list[idx];
};

Lister.prototype.remove = function (x) {
    this._list = _.without(this._list, x);
};

Lister.prototype.swap = function (i0, i1) {
    var list = this._list,
        tmp = list[i0];
    list[i0] = list[i1];
    list[i1] = tmp;
};

Lister.prototype.up = function (x) {
    var idx = this.index(x),
        newIdx = idx + 1;
    if (idx < 0) {
        return;
    }
    if (newIdx >= this._list.length) {
        var list =  new Array(this._list.length);
        list[0] = this.at(this._list.length - 1);
        for (var i = 0; i < (this._list.length - 2); i++) {
            list[i+1] = this.at(i);
        }
        this._list = list;
    }
    else {
        this.swap(idx, newIdx);
    }
};

Lister.prototype.down = function (x) {
    // TODO
};

Lister.prototype.getList = function () {
    return JSON.parse(JSON.stringify(this._list));
};

function listItem (layer, container, idx, lister) {
    var isVisible = lister.has(layer.id),
        elem = document.createElement('div'),
        label = document.createElement('span');

    elem.setAttribute('class', 'visible-layer visible-' + (
        isVisible ? 'yes' : 'no'
    ));
    label.setAttribute('class', 'visible-layer-label');

    label.innerHTML = layer.get('name', layer.id);

    elem.appendChild(label);
    container.appendChild(elem);

    var toggle = function () {
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
    var self = this,
        userId = self.getUser(),
        groupId = self.getGroup(),
        data = self.data, // this is a group
        shell = self.shell,
        stdout = self.sys.stdout,
        binder = self.binder,
        terminal = shell.terminal,
        display = terminal.display();

    var wrapper = document.createElement('div'),
        list = document.createElement('div'),
        cancelButton = document.createElement('div'),
        submitButton = document.createElement('div');

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

    var res = function(resolve, reject){

        var vl = data.get('visible'),
            visibleLayers = new Lister(vl),
            fv = !vl;

        var submit = function () {
            var vList = visibleLayers.getList();
            data.set('visible', vList);
            display.end();
            resolve(vList);
        };

        var close = function () {
            var vList = visibleLayers.getList();
            display.end();
            resolve(vList);
        };

        binder.getLayers(userId, groupId)
            .then(function(layers){
                for(var i = 0; i < layers.length; i++){
                    var layer = layers[i];
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


module.exports = exports = {
    name: 'visible',
    command: visible
};
