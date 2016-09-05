/*
 * app/lib/commands/wSet.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */

import _ from 'underscore';

import { addClass, removeClass, emptyElement, removeElement, hasClass, toggleClass, px, makeButton } from '../helpers';


const widgets = {
    'ValueSelect': require('./widgets/ValueSelect')
};

function makeWidgetForm (widget, ok, cancel) {
    const form = document.createElement('div');
    const buttonWrapper = document.createElement('div');
    const widgetWrapper = document.createElement('div');
    const buttonOk = makeButton('Ok', {}, ok);
    const buttonCancel = makeButton('Cancel', {}, cancel);

    addClass(form, 'widget-form');
    addClass(buttonWrapper, 'widget-buttons');
    addClass(buttonOk, 'widget-ok');
    addClass(buttonCancel, 'widget-cancel');
    addClass(widgetWrapper, 'widget-wrapper');

    buttonWrapper.appendChild(buttonOk);
    buttonWrapper.appendChild(buttonCancel);
    widgetWrapper.appendChild(widget.getNode());

    form.appendChild(widgetWrapper);
    form.appendChild(buttonWrapper);

    return form;
}


function wSet () {
    const self = this;
    const args = _.toArray(arguments);
    const name = args.shift();
    const key = args.shift();
    const data = this.data;
    oldValue = data.get(key);
    shell = this.shell,
    terminal = shell.terminal;

    const resolver = (resolve, reject) => {
        const display = terminal.display();
        try{
            const Widget = widgets[name];
            const config = {};
            for (let i = 0; i < args.length; i += 2) {
                const k = args[i];
                const v = JSON.parse(args[i + 1]);
                config[k] = v;
            }

            const widget = new Widget(config);
            retVal = oldValue;

            const ok = () => {
                display.end();
                resolve(data.get(key));
            };

            const cancel = () => {
                display.end();
                data.set(key, oldValue);
                resolve(data.get(key));
            };

            widget.on('value', v => {
                data.set(key, v);
            });

            const form = makeWidgetForm(widget, ok, cancel);
            display.node.appendChild(form);
        }
        catch (err) {
            display.end();
            reject(err);
        }
    };

    return (new Promise(resolver));
}


export default {
    name: 'wset',
    command: wSet
};
