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

var makeInput = helpers.makeInput;


function getFeatureStyle (layer, feature, style, def) {
    var layerStyle = layer.get('style', {}),
        featureStyle = _.defaults(feature.get('syle', {}), layerStyle);

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
        labelElement = document.createElement('div'),
        wrapper = document.createElement('div');

    labelElement.innerHTML = 'image clip';
    inputElement.setAttribute('type', 'checkbox');
    inputElement.value = 'yes/no';

    inputElement.addEventListener('change', function(event){
        feature.set('params.clip', !!inputElement.checked);
    }, false);



    inputElement.checked = getFeatureProp(layer, feature, 'params.clip', false);

    wrapper.appendChild(labelElement);
    wrapper.appendChild(inputElement);
    return wrapper;
}

function imageStyleAdjust (layer, feature) {
    var labelElement = document.createElement('div'),
        wrapper = document.createElement('div'),
        options = ['none', 'fit', 'cover'];


    labelElement.innerHTML = 'image adjust';
    wrapper.appendChild(labelElement);

    _.each(options, function(option){
        var radio = document.createElement('input'),
            radioWrapper= document.createElement('div');
        radio.setAttribute('type', 'radio');
        radio.setAttribute('name', 'imageClip');
        radio.setAttribute('value', option);
        if (getFeatureProp(layer, feature, 'params.adjust', 'none') === option) {
            radio.setAttribute('checked', 1);
        }
        radioWrapper.appendChild(radio);
        radioWrapper.appendChild(document.createTextNode(option));
        wrapper.appendChild(radioWrapper);
        radio.addEventListener('change', function(event){
            feature.set('params.adjust', option);
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
        ['font size', 'number', 'params.fontsize'],
        ['font color', 'color', 'style.fillStyle'],
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
        ['stroke color', 'color', 'style.strokeStyle'],
        ['line width', 'number', 'style.lineWidth'],
        ['hatches number', 'number', 'params.hn'],
        ['hatches step', 'number', 'params.step'],
        ['hatches rotation', 'number', 'params.rotation'],
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
        fid = current[3],
        display = terminal.display();

    var styleWidgetWrapper = document.createElement('div');
    styleWidgetWrapper.setAttribute('class', 'stylewidget-wrapper');
    display.node.appendChild(styleWidgetWrapper);


    var resolver = function (resolve, reject) {

        binder.getLayer(uid, gid, lid)
            .then(function(layer){
                binder.getFeature(uid, gid, lid, fid)
                .then(function(feature){
                    typeSelector({
                        container: styleWidgetWrapper,
                        layer: layer,
                        feature: feature
                    });

                    var closeButton = document.createElement('div');
                    closeButton.setAttribute('class', 'stylewidget-close');
                    closeButton.innerHTML = 'Close';

                    closeButton.addEventListener('click', function(){
                        display.end();
                        resolve(0);
                    }, false);

                    styleWidgetWrapper.appendChild(closeButton);
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
