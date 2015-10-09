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

var _ = require('underscore'),
    Promise = require('bluebird'),
    CodeMirror = require('codemirror');


function textEdit (opt_txt) {
    var self = this,
        shell = self.shell,
        stdout = shell.stdout,
        terminal = shell.terminal,
        map = shell.env.map,
        display = terminal.display();

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

    var resolver = function (resolve, reject) {
        var cm = CodeMirror(display.node, {
            'value': opt_txt || '',
            'autofocus': true,
            'lineWrapping': true
        });

        var buttons = document.createElement('div');
        buttons.setAttribute('class', 'edit-buttons push-button');

        var saveButton = document.createElement('div');
        saveButton.setAttribute('class', 'edit-validate push-validate');
        saveButton.innerHTML = 'validate';

        saveButton.addEventListener('click', function(){
            var doc = cm.getDoc(),
                txt = doc.getValue();
            display.end();
            resolve(txt);
        }, false);

        var cancelButton = document.createElement('div');
        cancelButton.setAttribute('class', 'edit-cancel push-cancel');
        cancelButton.innerHTML = 'cancel';

        cancelButton.addEventListener('click', function(){
            display.end();
            reject('Canceled');
        }, false);

        buttons.appendChild(saveButton);
        buttons.appendChild(cancelButton);
        display.node.appendChild(buttons);
    };

    return (new Promise(resolver));
}


module.exports = exports = {
    name: 'edit',
    command: textEdit
};
