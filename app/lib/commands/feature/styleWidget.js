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

var _ = require('underscore'),
    helpers = require('../../helpers'),
    Promise = require('bluebird');

var makeInput = helpers.makeInput,
    addClass = helpers.addClass,
    getModelName = helpers.getModelName;



function getFeatureStyle (layer, feature, style, def) {
    var layerStyle = layer.get('style', {}),
        featureStyle = _.defaults(feature.get('style', {}), layerStyle);

    if (style in featureStyle) {
        return featureStyle[style];
    }
    return def;
}

function getFeatureParams (layer, feature, param, def) {
    var layerParams = layer.get('params', {}),
        featureParams = _.defaults(feature.get('params', {}), layerParams);

    if (param in featureParams) {
        return featureParams[param];
    }
    return def;
}

function getFeatureProp (layer, feature, prop, def) {
    var parts = prop.split('.'),
        prefix = parts.shift(),
        k = parts.join('.');

    if ('params' === prefix) {
        return getFeatureParams(layer, feature, k, def);
    }
    return getFeatureStyle(layer, feature, k, def);
}



function imageStyleClip (layer, feature) {
    var inputElement = document.createElement('input'),
        labelElement = document.createElement('label'),
        wrapper = document.createElement('div');

    addClass(wrapper, 'stylewidget-element');

    labelElement.innerHTML = 'image clip : true/false';
    inputElement.setAttribute('type', 'checkbox');
    inputElement.value = 'yes/no';

    inputElement.addEventListener('change', function(event){
        feature.set('params.clip', !!inputElement.checked);
    }, false);



    inputElement.checked = getFeatureProp(layer, feature, 'params.clip', true);

    addClass(wrapper, 'stylewidget-element');
    wrapper.appendChild(labelElement);
    wrapper.appendChild(inputElement);
    return wrapper;
}

function imageStyleAdjust (layer, feature) {
    var labelElement = document.createElement('label'),
        wrapper = document.createElement('div'),
        options = [
            ['none', 'adjust to shape'],
            ['fit', 'fit in shape'],
            ['cover', 'cover shape']
        ];

    addClass(wrapper, 'stylewidget-element');

    labelElement.innerHTML = 'image proportions';
    addClass(wrapper, 'stylewidget-element');
    wrapper.appendChild(labelElement);

    _.each(options, function(option){
        var radio = document.createElement('input'),
            radioWrapper= document.createElement('div'),
            optionValue = option[0],
            optionLabel = option[1];

        radio.setAttribute('type', 'radio');
        radio.setAttribute('name', 'imageAdjust');
        radio.setAttribute('value', optionValue);
        if (getFeatureProp(layer, feature, 'params.adjust', 'none') === optionValue) {
            radio.setAttribute('checked', 1);
        }
        radioWrapper.appendChild(radio);
        radioWrapper.appendChild(document.createTextNode(optionLabel));
        wrapper.appendChild(radioWrapper);
        radio.addEventListener('change', function(event){
            feature.set('params.adjust', optionValue);
        }, false);
    });

    return wrapper;
}

function textContent (layer, feature) {
    var textArea = document.createElement('textarea'),
        labelElement = document.createElement('div'),
        wrapper = document.createElement('div'),
        content = getFeatureProp(layer, feature, 'params.text', '');

    labelElement.innerHTML = 'content';
    textArea.addEventListener('keyup', function(event){
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
    var container = ctx.container,
        layer = ctx.layer,
        feature = ctx.feature,
        inputs = [];

    var params = [
        imageStyleClip,
        imageStyleAdjust
    ];

    _.each(params, function(p){
        container.appendChild(p(layer, feature));
    });
}

function text (ctx) {
    var container = ctx.container,
        feature = ctx.feature,
        layer = ctx.layer,
        inputs = [];

    var params = [
        ['text size (meters)', 'number', 'params.fontsize'],
        ['text color', 'color', 'style.fillStyle'],
        textContent,
    ];

    function genCB (prop) {
        return function (val) {
            feature.set(prop, val);
        };
    }

    _.each(params, function(p){
        if (_.isFunction(p)) {
            container.appendChild(p(layer, feature));
        }
        else {
            var label = p[0],
                type = p[1],
                prop = p[2];

            var input = makeInput({
                label: label,
                type: type,
                value: getFeatureProp(layer, feature, prop, null)
            }, genCB(prop));
            addClass(input, 'stylewidget-element');
            container.appendChild(input);
        }
    });
}

function polygon (ctx) {
    var container = ctx.container,
        feature = ctx.feature,
        layer = ctx.layer,
        inputs = [];

    var params = [
        ['line color', 'color', 'style.strokeStyle'],
        ['line width (meters)', 'number', 'style.lineWidth'],
        ['hatches number', 'number', 'params.hn'],
        ['hatches step (meters)', 'number', 'params.step'],
        ['hatches angle (degrees)', 'number', 'params.rotation'],
    ];

    function genCB (prop) {
        return function (val) {
            feature.set(prop, val);
        };
    }

    _.each(params, function(p){
        if (_.isFunction(p)) {
            container.appendChild(p(layer, feature));
        }
        else {
            var label = p[0],
                type = p[1],
                prop = p[2];

            var input = makeInput({
                label: label,
                type: type,
                value: getFeatureProp(layer, feature, prop, null)
            }, genCB(prop));
            addClass(input, 'stylewidget-element');
            container.appendChild(input);
        }
    });
}

function line (ctx) {
    var container = ctx.container,
        feature = ctx.feature,
        layer = ctx.layer,
        inputs = [];

    var params = [
        ['stroke color', 'color', 'style.strokeStyle'],
        ['line width', 'number', 'style.lineWidth'],
    ];

    function genCB (prop) {
        return function (val) {
            feature.set(prop, val);
        };
    }

    _.each(params, function(p){
        if (_.isFunction(p)) {
            container.appendChild(p(layer, feature));
        }
        else {
            var label = p[0],
                type = p[1],
                prop = p[2];

            var input = makeInput({
                label: label,
                type: type,
                value: getFeatureProp(layer, feature, prop, null)
            }, genCB(prop));
            addClass(input, 'stylewidget-element');
            container.appendChild(input);
        }
    });
}

function typeSelector (options) {
    var feature = options.feature,
        layer = options.layer;
    if (getFeatureProp(layer, feature, 'params.image', false)) {
        return image(options);
    }
    else if (getFeatureProp(layer, feature, 'params.text', false)) {
        return text(options);
    }
    else {
        var geomType = feature.getGeometry().getType();
        if ('Polygon' === geomType) {
            return polygon(options);
        }
        else {
            return line(options);
        }
    }
}

function prepareContainer (layer, feature) {
    var styleWidgetWrapper = document.createElement('div'),
        styleWidgetHeader = document.createElement('div');

    addClass(styleWidgetWrapper, 'stylewidget-wrapper');
    addClass(styleWidgetHeader, 'stylewidget-header');

    styleWidgetHeader.appendChild(layer.getDomFragment('name'));
    styleWidgetHeader.appendChild(feature.getDomFragment('name'));

    styleWidgetWrapper.appendChild(styleWidgetHeader);
    return styleWidgetWrapper;
}


function styleWidget (opt_txt) {
    var self = this,
        env = self.shell.env,
        binder = self.binder,
        stdout = self.sys.stdout,
        stdin = self.sys.stdin,
        terminal = self.shell.terminal,
        current = self.current(),
        uid = current[0],
        gid = current[1],
        lid = current[2],
        fid = current[3];
        // display = terminal.display();


    var resolver = function (resolve, reject) {

        binder.getLayer(uid, gid, lid)
            .then(function(layer){
                binder.getFeature(uid, gid, lid, fid)
                .then(function(feature){
                    var styleWidgetWrapper = prepareContainer(layer, feature);
                    typeSelector({
                        container: styleWidgetWrapper,
                        layer: layer,
                        feature: feature
                    });
                    var com = terminal.makeCommand({
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


module.exports = exports = {
    name: 'styler',
    command: styleWidget
};
