/*
 * app/lib/commands/notify.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */

var _ = require('underscore'),
    semaphore = require('../Semaphore'),
    helpers = require('../helpers');



function SyncHandler (container, context) {
    this.container = container;
    this.binder = context.binder;
    this.shell = context.shell;
}

SyncHandler.prototype.start = function () {
    semaphore.on('sync', this.dispatch, this);
}

SyncHandler.prototype.dispatch = function (chan, cmd, data) {
    if ('update' === cmd) {
        this.onUpdate(chan, data);
    }
    else if ('create' === cmd) {
        this.onCreate(chan, data);
    }
    else if ('delete' === cmd) {
        this.onDelete(chan, data);
    }
};

SyncHandler.prototype.onUpdate = function (chan, data) {
    var container = this.container,
        binder = this.binder,
        shell = this.shell,
        db = binder.db,
        ctx = chan.type,
        cid = chan.id,
        elem = document.createElement('div');


    var model = db.get(data.id),
        comps = binder.getComps(model.id),
        path = 'cc /' + comps.join('/'),
        modelElem = document.createElement('div');

    modelElem.appendChild(document.createTextNode(helpers.getModelName(model)));
    elem.appendChild(document.createTextNode(model.type.toString() + ' updated'));
    elem.appendChild(modelElem);

    modelElem.addEventListener('click', function(){
        shell.exec(path);
    }, false);

    container.insertBefore(elem, container.firstChild);
}

SyncHandler.prototype.onCreate = function (chan, data) {
    var container = this.container,
        binder = this.binder,
        shell = this.shell,
        db = binder.db,
        ctx = chan.type,
        cid = chan.id,
        elem = document.createElement('div');

    if ('layer' === ctx) {
        if (db.has(data.id)) {
            var model = db.get(data.id),
                comps = binder.getComps(model.id),
                path = 'cc /' + comps.join('/'),
                modelElem = document.createElement('div');

            modelElem.appendChild(document.createTextNode(helpers.getModelName(model)));
            elem.appendChild(document.createTextNode(model.type.toString() + ' created'));
            elem.appendChild(modelElem);

            modelElem.addEventListener('click', function(){
                shell.exec(path);
            }, false);

            container.insertBefore(elem, container.firstChild);
        }
    }
}

SyncHandler.prototype.onDelete = function (chan, id) {

}

function notify () {
    var self = this,
        shell = self.shell,
        stdout = self.sys.stdout,
        terminal = shell.terminal,
        container = document.createElement('div'),
        sync = new SyncHandler(container, self);

    var wc = terminal.makeCommand({
        fragment: container,
        text: 'notifications'
    });

    stdout.write(wc);
    sync.start();
    return self.end();
};


module.exports = exports = {
    name: 'notify',
    command: notify
};
