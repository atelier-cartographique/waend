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

Lister.prototype.remove = function (x) {
    this._list = _.without(this._list, x);
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
        data = self.data,
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
    cancelButton.setAttribute('class', 'visible-cancel');
    submitButton.setAttribute('class', 'visible-submit');
    submitButton.innerHTML = 'OK';
    cancelButton.innerHTML = 'cancel';

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
            display.end();
            resolve(vList);
        };

        var cancel = function () {
            display.end();
            reject('Cancel');
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
            .catch(cancel);

        submitButton.addEventListener('click', submit, false);
        cancelButton.addEventListener('click', cancel, false);
    };
    return (new Promise(res));
}


module.exports = exports = {
    name: 'visible',
    command: visible
};
