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
    Promise = require('bluebird'),
    semaphore = require('../../Semaphore'),
    helpers = require('../../helpers');

var emptyElement = helpers.emptyElement;

function Lister (l) {
    this.update(l);
}

Lister.prototype.update = function (l) {
    l = l || [];
    this._list = JSON.parse(JSON.stringify(l));
};

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

Lister.prototype.down = function (idx) {
    var newIdx = idx + 1;
    if (newIdx >= this._list.length) {
        return;
    }
    this.swap(idx, newIdx);
};

Lister.prototype.up = function (idx) {
    var newIdx = idx - 1;
    if (newIdx < 0) {
        return;
    }
    this.swap(idx, newIdx);
};

Lister.prototype.getList = function () {
    return JSON.parse(JSON.stringify(this._list));
};

function listItem (layer, container, idx, lister) {
    var isVisible = lister.has(layer.id),
        elem = document.createElement('div'),
        label = document.createElement('span'),
        elemUp = document.createElement('span'),
        elemDown = document.createElement('span');

    elem.setAttribute('class', 'visible-layer visible-' + (
        isVisible ? 'yes' : 'no'
    ));

    label.setAttribute('class', 'visible-layer-label');
    label.innerHTML = layer.get('name', layer.id);
    elemUp.innerHTML = ' ↑ ';
    elemDown.innerHTML = ' ↓ ';


    elem.appendChild(label);
    if (isVisible) {
        elem.appendChild(elemUp);
        elem.appendChild(elemDown);
        elemUp.addEventListener('click', function () {
            lister.up(idx);
            semaphore.signal('visibility:change', lister.getList());
        }, false);
        elemDown.addEventListener('click', function () {
            lister.down(idx);
            semaphore.signal('visibility:change', lister.getList());
        }, false);
    }
    container.appendChild(elem);

    var toggle = function () {
        if (isVisible) {
            lister.remove(layer.id);
            elem.setAttribute('class', 'visible-layer visible-no');
        }
        else {
            lister.insert(idx, layer.id);
            elem.setAttribute('class', 'visible-layer visible-yes');
        }
        semaphore.signal('visibility:change', lister.getList());
    };


    label.addEventListener('click', toggle, false);
}


function listUpdater (baseLayers, container, visibleLayers) {
    return function (mapVisibleLayers) {
        visibleLayers.update(mapVisibleLayers);
        emptyElement(container);
        var layers = _.clone(baseLayers);
        var i;
        if (!!mapVisibleLayers) {
            for (i = 0; i < mapVisibleLayers.length; i++) {
                var layerIdx = _.findIndex(layers, function (lyr) {
                    return mapVisibleLayers[i] === lyr.id;
                });
                var layer = layers[layerIdx];
                listItem(layer, container, i, visibleLayers);
                layers.splice(layerIdx, 1);
            }
        }
        for (i = 0; i < layers.length; i++){
            var layer = layers[i];
            if (!mapVisibleLayers) {
                visibleLayers.insert(i, layer.id);
                listItem(layer, container, i, visibleLayers);
            }
            else {
                listItem(layer, container,
                    i + mapVisibleLayers.length, visibleLayers);
            }
        }
    };
};


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

    var mapVisibleLayers = data.get('visible');
    var visibleLayers = new Lister(mapVisibleLayers);


    var res = function(resolve, reject){

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


        submitButton.addEventListener('click', submit, false);
        cancelButton.addEventListener('click', close, false);

        binder.getLayers(userId, groupId)
            .then(function (layers) {
                var updater = listUpdater(layers, list, visibleLayers);
                updater(mapVisibleLayers);
                semaphore.on('visibility:change', function (mvl) {
                    updater(mvl);
                });
            })
            .catch(close);

    };
    return (new Promise(res));
}


module.exports = exports = {
    name: 'visible',
    command: visible
};
