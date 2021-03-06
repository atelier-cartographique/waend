/*
 * app/lib/commands/createGroup.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */


var _ = require('underscore'),
    Promise = require('bluebird'),
    semaphore = require('../Semaphore'),
    region = require('../Region'),
    helpers = require('../helpers');


var addClass = helpers.addClass,
    setAttributes = helpers.setAttributes,
    makeButton = helpers.makeButton;


function makeButtons(node, okCallback, cancelCallback) {
    var wrapper = document.createElement('div'),
        okBtn = makeButton('OK', {
            'class': 'button grp-button-ok push-validate'
        }, okCallback),
        cancelBtn = makeButton('Cancel', {
            'class': 'button grp-button-cancel push-cancel'
        }, cancelCallback);
    addClass(wrapper, 'grp-button-wrapper');
    wrapper.appendChild(okBtn);
    wrapper.appendChild(cancelBtn);
    node.appendChild(wrapper);
}

function makeForm(node, label) {
    var form = document.createElement('div'),
        labelElement = document.createElement('div'),
        title = document.createElement('input'),
        desc = document.createElement('textarea');


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
        title: title,
        description: desc
    };
}



function createGroup (ctx, user, resolve, reject) {
    var binder = ctx.binder,
        shell = ctx.shell,
        terminal = shell.terminal,
        display = terminal.display();

    var form = makeForm(display.node, 'Add a new map');

    var createOK = function () {
        var title = form.title.value,
            desc = form.description.value;
        if((title.length > 0) && (desc.length > 0)) {
            var data = {
                user_id: user.id,
                status_flag: 0,
                properties: {
                    'name': title,
                    'description': desc}
            };

            ctx.binder.setGroup(user.id, data)
                .then(function(model){
                    resolve(model);
                    shell.exec('cc /' + user.id + '/' + model.id);
                })
                .catch(reject)
                .finally(function(){
                    display.end();
                });
        }
    };

    var createCancel = function () {
        reject('Cancel');
        display.end();
    };

    makeButtons(display.node, createOK, createCancel);
}


function iCreate (groupName, groupDescription) {
    var self = this,
        terminal = self.shell.terminal,
        stdout = self.sys.stdout,
        stdin = self.sys.stdin,
        user = self.shell.getUser();

    if (!user) {
        return (Promise.reject('You\'re not logged in.'));
    }

    var creator = _.partial(createGroup, self, user);

    return (new Promise(creator));
}


module.exports = exports = {
    name: 'mkgroup',
    command: iCreate
};
