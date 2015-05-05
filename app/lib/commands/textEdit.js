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

    opt_txt = opt_txt || shell.env.DELIVERED;

    var resolver = function (resolve, reject) {
        var cm = CodeMirror(display.node, {
            'value': opt_txt || ''
        });


        var saveButton = document.createElement('div');
        saveButton.setAttribute('class', 'edit-save');
        saveButton.innerHTML = 'save';

        saveButton.addEventListener('click', function(){
            var doc = cm.getDoc(),
                txt = doc.getValue();
            display.end();
            resolve(txt);
        }, false);

        display.node.appendChild(saveButton);
    };

    return (new Promise(resolver));
}


module.exports = exports = {
    name: 'edit',
    command: textEdit
};
