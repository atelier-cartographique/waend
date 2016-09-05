/*
 * app/lib/commands/createGroup.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */


import _ from 'underscore';

import Promise from 'bluebird';
import semaphore from '../Semaphore';
import region from '../Region';
import {addClass, setAttributes, makeButton} from '../helpers';



function makeButtons(node, okCallback, cancelCallback) {
    const wrapper = document.createElement('div');

    const okBtn = makeButton('OK', {
        'class': 'button grp-button-ok push-validate'
    }, okCallback);

    const cancelBtn = makeButton('Cancel', {
        'class': 'button grp-button-cancel push-cancel'
    }, cancelCallback);

    addClass(wrapper, 'grp-button-wrapper');
    wrapper.appendChild(okBtn);
    wrapper.appendChild(cancelBtn);
    node.appendChild(wrapper);
}

function makeForm(node, label) {
    const form = document.createElement('div');
    const labelElement = document.createElement('div');
    const title = document.createElement('input');
    const desc = document.createElement('textarea');


    setAttributes(title, {
        'type': 'text',
        'class': 'grp-input-title',
        'placeholder': 'map name'
    });

    setAttributes(desc, {
        'class': 'grp-input-description',
        'rows': '7',
        'cols': '50',
        'placeholder': 'map description'
    });

    addClass(form, 'grp-form');
    addClass(labelElement, 'form-label');

    labelElement.innerHTML = label.toString();

    form.appendChild(labelElement);
    form.appendChild(title);
    form.appendChild(desc);
    node.appendChild(form);

    return {
        title,
        description: desc
    };
}



function createGroup (ctx, user, resolve, reject) {
    const binder = ctx.binder;
    const shell = ctx.shell;
    const terminal = shell.terminal;
    const display = terminal.display();

    const form = makeForm(display.node, 'Add a new map');

    const createOK = () => {
        const title = form.title.value;
        const desc = form.description.value;
        if((title.length > 0) && (desc.length > 0)) {
            const data = {
                user_id: user.id,
                status_flag: 0,
                properties: {
                    'name': title,
                    'description': desc}
            };

            ctx.binder.setGroup(user.id, data)
                .then(model => {
                    resolve(model);
                    shell.exec(`cc /${user.id}/${model.id}`);
                })
                .catch(reject)
                .finally(() => {
                    display.end();
                });
        }
    };

    const createCancel = () => {
        reject('Cancel');
        display.end();
    };

    makeButtons(display.node, createOK, createCancel);
}


function iCreate (groupName, groupDescription) {
    const self = this;
    const terminal = self.shell.terminal;
    const stdout = self.sys.stdout;
    const stdin = self.sys.stdin;
    const user = self.shell.getUser();

    if (!user) {
        return (Promise.reject('You\'re not logged in.'));
    }

    const creator = _.partial(createGroup, self, user);

    return (new Promise(creator));
}


export default {
    name: 'mkgroup',
    command: iCreate
};
