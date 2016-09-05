/*
 * app/lib/commands/widget.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */

import _ from 'underscore';

import Promise from 'bluebird';

const widgets = {
    'ValueSelect': require('./widgets/ValueSelect')
};


function displayWidget () {
    const self = this;
    const args = _.toArray(arguments);
    const name = args.shift();
    const shell = this.shell;
    const terminal = shell.terminal;
    const display = terminal.display();
    const config = {};
    let Widget;

    const resolver = (resolve, reject) => {
        try{
            Widget = widgets[name];
            for (let i = 0; i < args.length; i += 2) {
                const k = args[i];
                const v = JSON.parse(args[i + 1]);
                config[k] = v;
            }
            const wdgt = new Widget(config);
            display.node.appendChild(wdgt.getNode());
        }
        catch (err) {
            display.end();
            reject(err);
        }
    };

    return (new Promise(resolver));
}


export default {
    name: 'widget',
    command: displayWidget
};
