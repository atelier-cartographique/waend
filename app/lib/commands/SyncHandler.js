/*
 * app/lib/commands/SyncHandler.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */

import _ from 'underscore';

import semaphore from '../Semaphore';
import {getModelName} from '../helpers';

class SyncHandler {
    constructor(container, context) {
        this.container = container;
        this.binder = context.binder;
        this.shell = context.shell;
        this.follower = null;
    }

    start() {
        semaphore.on('sync', this.dispatch.bind(this));
        return this;
    }

    follow(cb, ctx) {
        this.follower = {
            callback: cb,
            context: ctx
        };
        return this;
    }

    dispatch(chan, cmd, data) {
        if ('update' === cmd) {
            this.onUpdate(chan, data);
        }
        else if ('create' === cmd) {
            this.onCreate(chan, data);
        }
        else if ('delete' === cmd) {
            this.onDelete(chan, data);
        }
    }

    onUpdate(chan, data) {
        const container = this.container;
        const binder = this.binder;
        const shell = this.shell;
        const db = binder.db;
        const ctx = chan.type;
        const cid = chan.id;
        const elem = document.createElement('div');
        const model = db.get(data.id);
        const comps = model.getPath();
        const path = `cc /${comps.join('/')}`;
        const modelElem = document.createElement('div');

        if ('user_id' in data) {
            const userElem = document.createElement('span');
            elem.appendChild(userElem);
            binder.getUser(data.user_id)
                .then(user => {
                    userElem.innerHTML = `${getModelName(user)} `;
                })
                .catch(() => {
                    elem.removeChild(userElem);
                });
        }

        modelElem.appendChild(document.createTextNode(getModelName(model)));
        elem.appendChild(
            document.createTextNode(`updated a ${model.type.toString()}`)
        );
        elem.appendChild(modelElem);

        modelElem.addEventListener('click', () => {
            shell.exec(path);
        }, false);

        container.insertBefore(elem, container.firstChild);

        if (this.follower) {
            this.follower.callback.call(this.follower.context, model);
        }
    }

    onCreate(chan, data) {
        const container = this.container;
        const binder = this.binder;
        const shell = this.shell;
        const db = binder.db;
        const ctx = chan.type;
        const cid = chan.id;
        const elem = document.createElement('div');

        if ('layer' === ctx) {
            if (db.has(data.id)) {
                var model = db.get(data.id);
                const comps = binder.getComps(model.id);
                const path = `cc /${comps.join('/')}`;
                const modelElem = document.createElement('div');

                if ('user_id' in data) {
                    const userElem = document.createElement('span');
                    elem.appendChild(userElem);
                    binder.getUser(data.user_id)
                        .then(user => {
                            userElem.innerHTML = `${getModelName(user)} `;
                        })
                        .catch(() => {
                            elem.removeChild(userElem);
                        });
                }


                modelElem.appendChild(document.createTextNode(getModelName(model)));
                elem.appendChild(
                    document.createTextNode(`created a${model.type.toString()}`)
                );
                elem.appendChild(modelElem);

                modelElem.addEventListener('click', () => {
                    shell.exec(path);
                }, false);

                container.insertBefore(elem, container.firstChild);
            }
            if (this.follower) {
                this.follower.callback.call(this.follower.context, model);
            }
        }
    }

    onDelete(chan, id) {

    }
}

export default SyncHandler;
