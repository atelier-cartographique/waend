/*
 * app/lib/commands/feature/styleWidget.js
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



function getFeatureStyle (layer, feature, style, def) {
    const layerStyle = layer.get('style', {});
    const featureStyle = _.defaults(feature.get('style', {}), layerStyle);

    if (style in featureStyle) {
        return featureStyle[style];
    }
    return def;
}

function getFeatureParams (layer, feature, param, def) {
    const layerParams = layer.get('params', {});
    const featureParams = _.defaults(feature.get('params', {}), layerParams);

    if (param in featureParams) {
        return featureParams[param];
    }
    return def;
}

function getFeatureProp (layer, feature, prop, def) {
    const parts = prop.split('.');
    const prefix = parts.shift();
    const k = parts.join('.');

    if ('params' === prefix) {
        return getFeatureParams(layer, feature, k, def);
    }
    return getFeatureStyle(layer, feature, k, def);
}



function imageStyleClip (layer, feature) {
    const inputElement = document.createElement('input');
    const labelElement = document.createElement('label');
    const wrapper = document.createElement('div');

    addClass(wrapper, 'stylewidget-element');

    labelElement.innerHTML = 'image clip : yes/no';
    inputElement.setAttribute('type', 'checkbox');
    inputElement.value = 'yes/no';

    inputElement.addEventListener('change', event => {
        feature.set('params.clip', !!inputElement.checked);
    }, false);



    inputElement.checked = getFeatureProp(layer, feature, 'params.clip', true);

    addClass(wrapper, 'stylewidget-element');
    wrapper.appendChild(labelElement);
    wrapper.appendChild(inputElement);
    return wrapper;
}

function imageStyleAdjust (layer, feature) {
    const labelElement = document.createElement('label');
    const wrapper = document.createElement('div');

    const options = [
        ['none', 'adjust to shape'],
        ['fit', 'fit in shape'],
        ['cover', 'cover shape']
    ];

    addClass(wrapper, 'stylewidget-element');

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
        if (getFeatureProp(layer, feature, 'params.adjust', 'none') === optionValue) {
            radio.setAttribute('checked', 1);
        }
        radioWrapper.appendChild(radio);
        radioWrapper.appendChild(document.createTextNode(optionLabel));
        wrapper.appendChild(radioWrapper);
        radio.addEventListener('change', event => {
            feature.set('params.adjust', optionValue);
        }, false);
    });

    return wrapper;
}

function textContent (layer, feature) {
    const textArea = document.createElement('textarea');
    const labelElement = document.createElement('div');
    const wrapper = document.createElement('div');
    const content = getFeatureProp(layer, feature, 'params.text', '');

    labelElement.innerHTML = 'content';
    textArea.addEventListener('keyup', event => {
        feature.set('params.text', textArea.value);
    }, false);

    // textArea.appendChild(document.createTextNode(content));
    textArea.value = content;
    addClass(wrapper, 'stylewidget-element');
    wrapper.appendChild(labelElement);
    wrapper.appendChild(textArea);
    return wrapper;
}

function image (ctx) {
    const container = ctx.container;
    const layer = ctx.layer;
    const feature = ctx.feature;
    const inputs = [];

    const params = [
        imageStyleClip,
        imageStyleAdjust
    ];

    _.each(params, p => {
        container.appendChild(p(layer, feature));
    });
}

function text (ctx) {
    const container = ctx.container;
    const feature = ctx.feature;
    const layer = ctx.layer;
    const inputs = [];

    const params = [
        ['text size (meters)', 'number', 'params.fontsize'],
        ['text color', 'color', 'style.fillStyle'],
        textContent,
    ];

    function genCB (prop) {
        return val => {
            feature.set(prop, val);
        };
    }

    _.each(params, p => {
        if (_.isFunction(p)) {
            container.appendChild(p(layer, feature));
        }
        else {
            const label = p[0];
            const type = p[1];
            const prop = p[2];

            const input = makeInput({
                label,
                type,
                value: getFeatureProp(layer, feature, prop, null)
            }, genCB(prop));
            addClass(input, 'stylewidget-element');
            container.appendChild(input);
        }
    });
}

function polygon (ctx) {
    const container = ctx.container;
    const feature = ctx.feature;
    const layer = ctx.layer;
    const inputs = [];

    const params = [
        ['line color', 'color', 'style.strokeStyle'],
        ['line width (meters)', 'number', 'style.lineWidth'],
        ['hatches number', 'number', 'params.hn'],
        ['hatches step (meters)', 'number', 'params.step'],
        ['hatches angle (degrees)', 'number', 'params.rotation'],
    ];

    function genCB (prop) {
        return val => {
            feature.set(prop, val);
        };
    }

    _.each(params, p => {
        if (_.isFunction(p)) {
            container.appendChild(p(layer, feature));
        }
        else {
            const label = p[0];
            const type = p[1];
            const prop = p[2];

            const input = makeInput({
                label,
                type,
                value: getFeatureProp(layer, feature, prop, null)
            }, genCB(prop));
            addClass(input, 'stylewidget-element');
            container.appendChild(input);
        }
    });
}

function line (ctx) {
    const container = ctx.container;
    const feature = ctx.feature;
    const layer = ctx.layer;
    const inputs = [];

    const params = [
        ['stroke color', 'color', 'style.strokeStyle'],
        ['line width', 'number', 'style.lineWidth'],
    ];

    function genCB (prop) {
        return val => {
            feature.set(prop, val);
        };
    }

    _.each(params, p => {
        if (_.isFunction(p)) {
            container.appendChild(p(layer, feature));
        }
        else {
            const label = p[0];
            const type = p[1];
            const prop = p[2];

            const input = makeInput({
                label,
                type,
                value: getFeatureProp(layer, feature, prop, null)
            }, genCB(prop));
            addClass(input, 'stylewidget-element');
            container.appendChild(input);
        }
    });
}

function typeSelector (options) {
    const feature = options.feature;
    const layer = options.layer;
    if (getFeatureProp(layer, feature, 'params.image', false)) {
        return image(options);
    }
    else if (getFeatureProp(layer, feature, 'params.text', false)) {
        return text(options);
    }
    else {
        const geomType = feature.getGeometry().getType();
        if ('Polygon' === geomType) {
            return polygon(options);
        }
        else {
            return line(options);
        }
    }
}

function prepareContainer (layer, feature) {
    const styleWidgetWrapper = document.createElement('div');
    const styleWidgetHeader = document.createElement('div');
    const styleWidgetHeaderLayer = document.createElement('div');
    const styleWidgetHeaderFeature = document.createElement('div');
    const styleWidgetHeaderLayerLabel = document.createElement('label');
    const styleWidgetHeaderFeatureLabel = document.createElement('label');



    addClass(styleWidgetWrapper, 'stylewidget-wrapper');
    addClass(styleWidgetHeader, 'stylewidget-header');
    addClass(styleWidgetHeaderLayer, 'stylewidget-header-layer');
    addClass(styleWidgetHeaderFeature, 'stylewidget-header-feature');

    styleWidgetHeaderLayerLabel.innerHTML = 'LAYER : ';
    styleWidgetHeaderFeatureLabel.innerHTML = 'FEATURE : ';

    styleWidgetHeaderLayer.appendChild(styleWidgetHeaderLayerLabel);
    styleWidgetHeaderLayer.appendChild(layer.getDomFragment('name'));
    styleWidgetHeaderFeature.appendChild(styleWidgetHeaderFeatureLabel);
    styleWidgetHeaderFeature.appendChild(feature.getDomFragment('name'));


    styleWidgetHeader.appendChild(styleWidgetHeaderLayer);
    styleWidgetHeader.appendChild(styleWidgetHeaderFeature);

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
    const fid = current[3];


    const resolver = (resolve, reject) => {

        binder.getLayer(uid, gid, lid)
            .then(layer => {
                binder.getFeature(uid, gid, lid, fid)
                .then(feature => {
                    const styleWidgetWrapper = prepareContainer(layer, feature);
                    typeSelector({
                        container: styleWidgetWrapper,
                        layer,
                        feature
                    });
                    const com = terminal.makeCommand({
                                fragment: styleWidgetWrapper,
                                text: 'style' //dummy text to prevent troubles..
                            });

                    stdout.write(com);
                    resolve(feature.get('style'));
                })
                .catch(reject);
            })
            .catch(reject);
    };

    return (new Promise(resolver));
}


export default {
    name: 'styler',
    command: styleWidget
};
