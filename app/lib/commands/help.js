/*
 * app/lib/commands/help.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */

import _ from 'underscore';

import Promise from 'bluebird';

function help () {
    const self = this;
    const shell = self.shell;
    const stdout = shell.stdout;
    const terminal = shell.terminal;
    const map = shell.env.map;
    const display = terminal.display();


    const closer = reject => {

        const helpFrameWrapper = document.createElement('div');
        helpFrameWrapper.setAttribute('class', 'help-wrapper');
        display.node.appendChild(helpFrameWrapper);

        const helpFrame = document.createElement('iframe');
        helpFrame.setAttribute('src', '/documentation/help.html');
        helpFrameWrapper.appendChild(helpFrame);

        const buttons = document.createElement('div');
        buttons.setAttribute('class', 'help-buttons');


        const closeButton = document.createElement('div');
        closeButton.setAttribute('class', 'help-close');
        closeButton.innerHTML = 'Close';

        closeButton.addEventListener('click', () => {
            display.end();
            reject('Canceled');
        }, false);

        const newWindowCloseButton = document.createElement('a');
        newWindowCloseButton.setAttribute('class', 'help-open-new-window');
        newWindowCloseButton.setAttribute('href', '/documentation/help.html');
        newWindowCloseButton.setAttribute('target', 'blank');
        newWindowCloseButton.innerHTML = 'Open in new window';

        newWindowCloseButton.addEventListener('click', () => {
            display.end();
            reject('Canceled');
        }, false);

        buttons.appendChild(closeButton);
        buttons.appendChild(newWindowCloseButton);
        display.node.appendChild(buttons);
    };

    return (new Promise(closer));
}


export default {
    name: 'help',
    command: help
};
