/*
 * app/lib/commands/textEdit.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */

// 'use strict';

import _ from 'underscore';

import Promise from 'bluebird';
import CodeMirror from 'codemirror';


function textEdit (opt_txt) {
    const self = this;
    const shell = self.shell;
    const stdout = shell.stdout;
    const terminal = shell.terminal;
    const map = shell.env.map;
    const display = terminal.display();

    if (!opt_txt && shell.env.DELIVERED) {
        if (_.isString(shell.env.DELIVERED)) {
            opt_txt = shell.env.DELIVERED;
        }
        else {
            try {
                opt_txt = JSON.stringify(shell.env.DELIVERED);
            }
            catch (err) {
                opt_txt = '';
            }
        }
    }

    const resolver = (resolve, reject) => {
        const cm = CodeMirror(display.node, {
            'value': opt_txt || '',
            'autofocus': true,
            'lineWrapping': true
        });

        const buttons = document.createElement('div');
        buttons.setAttribute('class', 'edit-buttons push-button');

        const cancelButton = document.createElement('div');
        cancelButton.setAttribute('class', 'widget-closer icon-close');
        cancelButton.innerHTML = 'cancel';

        cancelButton.addEventListener('click', () => {
            display.end();
            reject('Text editor canceled');
        }, false);


        const widgetTitle = document.createElement('div');
        widgetTitle.setAttribute('class', 'widget-title ');
        widgetTitle.innerHTML = 'Text editor';

        const saveButton = document.createElement('div');
        saveButton.setAttribute('class', 'edit-validate push-validate');
        saveButton.innerHTML = 'validate text';

        saveButton.addEventListener('click', () => {
            const doc = cm.getDoc();
            const txt = doc.getValue();
            display.end();
            resolve(txt);
        }, false);

        buttons.appendChild(cancelButton);
        buttons.appendChild(widgetTitle);
        buttons.appendChild(saveButton);
        display.node.appendChild(buttons);
    };

    return (new Promise(resolver));
}


export default {
    name: 'edit',
    command: textEdit
};
