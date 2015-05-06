/*
 * app/lib/commands/help.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */

var _ = require('underscore'),
    Promise = require('bluebird');

function help () {
    var self = this,
        shell = self.shell,
        stdout = shell.stdout,
        terminal = shell.terminal,
        map = shell.env.map,
        display = terminal.display();


    var closer = function (reject) {

        var helpFrameWrapper = document.createElement('div');
        helpFrameWrapper.setAttribute('class', 'help-wrapper');
        display.node.appendChild(helpFrameWrapper);

        var helpFrame = document.createElement('iframe');
        helpFrame.setAttribute('src', '/documentation/help.html');
        helpFrameWrapper.appendChild(helpFrame);

        var buttons = document.createElement('div');
        buttons.setAttribute('class', 'help-buttons');


        var closeButton = document.createElement('div');
        closeButton.setAttribute('class', 'help-close');
        closeButton.innerHTML = 'Close';

        closeButton.addEventListener('click', function(){
            display.end();
            reject('Canceled');
        }, false);

        buttons.appendChild(closeButton);
        display.node.appendChild(buttons);
    };

    return (new Promise(closer));
}


module.exports = exports = {
    name: 'help',
    command: help
};
