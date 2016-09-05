/*
 * app/lib/commands/layer/styleWidget.js
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
import {makeInput, addClass, getModelName} from '../../helpers';


function imageStyleClip (layer) {
    const inputElement = document.createElement('input');
    const labelElement = document.createElement('label');
    const wrapper = document.createElement('div');

    labelElement.innerHTML = 'image clip : Yes/No';
    inputElement.setAttribute('type', 'checkbox');
    inputElement.value = 'yes/no';

    inputElement.addEventListener('change', event => {
        layer.set('params.clip', !!inputElement.checked);
    }, false);

    inputElement.checked = layer.get('params.clip', true);

    addClass(wrapper, 'stylewidget-element');

    wrapper.appendChild(labelElement);
    wrapper.appendChild(inputElement);
    return wrapper;
}

function imageStyleAdjust (layer) {
    const labelElement = document.createElement('label');
    const wrapper = document.createElement('div');

    const options = [
        ['none', 'adjust to shape'],
        ['fit', 'fit in shape'],
        ['cover', 'cover shape']
    ];

    labelElement.innerHTML = 'image proportions';
    addClass(wrapper, 'stylewidget-element');
    wrapper.appendChild(labelElement);

    _.each(options, option => {
        const radio = document.createElement('input');
        const radioWrapper= document.createElement('div');
        const optionValue = option[0];
        const optionLabel = option[1];

        radio.setAttribute('type', 'radio');
        radio.setAttribute('name', 'imageAdjust');
        radio.setAttribute('value', optionValue);
        if (layer.get('params.adjust', 'none') === optionValue) {
            radio.setAttribute('checked', 1);
        }
        radioWrapper.appendChild(radio);
        radioWrapper.appendChild(document.createTextNode(optionLabel));
        wrapper.appendChild(radioWrapper);
        radio.addEventListener('change', event => {
            layer.set('params.adjust', optionValue);
        }, false);
    });

    return wrapper;
}


function layerCompositing (layer) {
    const labelElement = document.createElement('label');
    const wrapper = document.createElement('div');
    const options = ['source-over', 'multiply'];


    labelElement.innerHTML = 'layer compositing';
    addClass(wrapper, 'stylewidget-element');
    wrapper.appendChild(labelElement);

    _.each(options, option => {
        const radio = document.createElement('input');
        const radioWrapper= document.createElement('div');
        radio.setAttribute('type', 'radio');
        radio.setAttribute('name', 'compositing');
        radio.setAttribute('value', option);
        if (layer.get('style.globalCompositeOperation', 'multiply') === option) {
            radio.setAttribute('checked', 1);
        }
        radioWrapper.appendChild(radio);
        radioWrapper.appendChild(document.createTextNode(option));
        wrapper.appendChild(radioWrapper);
        radio.addEventListener('change', event => {
            layer.set('style.globalCompositeOperation', option);
        }, false);
    });

    return wrapper;
}


function styler (ctx) {
    const container = ctx.container;
    const layer = ctx.layer;
    const inputs = [];


    const params = [
        ['line color', 'color', 'style.strokeStyle'],
        ['line width (meters)', 'number', 'style.lineWidth'],
        ['hatches number', 'number', 'params.hn'],
        ['hatches step (meters)', 'number', 'params.step'],
        ['hatches angle (degrees)', 'number', 'params.rotation'],
        ['text size (meters)', 'number', 'params.fontsize'],
        ['text color', 'color', 'style.fillStyle'],
        imageStyleClip,
        imageStyleAdjust,
        layerCompositing
    ];

    const genCB = prop => val => {
        layer.set(prop, val);
    };

    _.each(params, p => {
        if (_.isFunction(p)) {
            container.appendChild(p(layer));
        }
        else {
            const label = p[0];
            const type = p[1];
            const prop = p[2];

            const input = makeInput({
                label,
                type,
                value: layer.get(prop)
            }, genCB(prop));
            addClass(input, 'stylewidget-element');
            container.appendChild(input);
        }

    });
}

function prepareContainer (layer) {
    const styleWidgetWrapper = document.createElement('div');
    const styleWidgetHeader = document.createElement('div');
    const styleWidgetHeaderLayer = document.createElement('div');
    const styleWidgetHeaderLayerLabel = document.createElement('label');


    addClass(styleWidgetWrapper, 'stylewidget-wrapper');
    addClass(styleWidgetHeader, 'stylewidget-header');

    styleWidgetHeaderLayerLabel.innerHTML = 'Layer : ';

    styleWidgetHeaderLayer.appendChild(styleWidgetHeaderLayerLabel);
    styleWidgetHeaderLayer.appendChild(
        document.createTextNode(getModelName(layer))
        );

    styleWidgetHeader.appendChild(styleWidgetHeaderLayer);

    styleWidgetWrapper.appendChild(styleWidgetHeader);
    return styleWidgetWrapper;
}


function styleWidget (opt_txt) {
    const self = this;
    // display = terminal.display();

    const env = self.shell.env;
    const binder = self.binder;
    const stdout = self.sys.stdout;
    const stdin = self.sys.stdin;
    const terminal = self.shell.terminal;
    const current = self.current();
    const uid = current[0];
    const gid = current[1];
    const lid = current[2];




    const resolver = (resolve, reject) => {

        binder.getLayer(uid, gid, lid)
            .then(layer => {
                const styleWidgetWrapper = prepareContainer(layer);
                styler({
                    container: styleWidgetWrapper,
                    layer
                });
                const com = terminal.makeCommand({
                            fragment: styleWidgetWrapper,
                            text: 'style' //dummy text to prevent troubles..
                        });

                stdout.write(com);
                resolve(layer.get('style'));

                // var closeButton = document.createElement('div');
                // addClass(closeButton, 'stylewidget-close push-cancel');
                // closeButton.innerHTML = 'Close';

                // closeButton.addEventListener('click', function(){
                //     display.end();
                //     resolve(0);
                // }, false);

                // styleWidgetWrapper.appendChild(closeButton);
                // display.node.appendChild(styleWidgetWrapper);
            })
            .catch(reject);
    };

    return (new Promise(resolver));
}


export default {
    name: 'styler',
    command: styleWidget
};
