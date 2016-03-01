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

var _ = require('underscore'),
    helpers = require('../../helpers'),
    Promise = require('bluebird');

var makeInput = helpers.makeInput,
    addClass = helpers.addClass,
    getModelName = helpers.getModelName;


function imageStyleClip (layer) {
    var inputElement = document.createElement('input'),
        labelElement = document.createElement('label'),
        wrapper = document.createElement('div');

    labelElement.innerHTML = 'image clip : Yes/No';
    inputElement.setAttribute('type', 'checkbox');
    inputElement.value = 'yes/no';

    inputElement.addEventListener('change', function(event){
        layer.set('params.clip', !!inputElement.checked);
    }, false);

    inputElement.checked = layer.get('params.clip', false);

    wrapper.setAttribute('class','stylewidget-element');
    wrapper.appendChild(labelElement);
    wrapper.appendChild(inputElement);
    return wrapper;
}

function imageStyleAdjust (layer) {
    var labelElement = document.createElement('label'),
        wrapper = document.createElement('div'),
        options = ['adjust to shape', 'fit in shape', 'cover shape'];


    labelElement.innerHTML = 'image proportions';
    wrapper.setAttribute('class','stylewidget-element');
    wrapper.appendChild(labelElement);

    _.each(options, function(option){
        var radio = document.createElement('input'),
            radioWrapper= document.createElement('div');
        radio.setAttribute('type', 'radio');
        radio.setAttribute('name', 'imageClip');
        radio.setAttribute('value', option);
        if (layer.get('params.adjust', 'none') === option) {
            radio.setAttribute('checked', 1);
        }
        radioWrapper.appendChild(radio);
        radioWrapper.appendChild(document.createTextNode(option));
        wrapper.appendChild(radioWrapper);
        radio.addEventListener('change', function(event){
            layer.set('params.adjust', option);
        }, false);
    });

    return wrapper;
}

function layerCompositing (layer) {
    var labelElement = document.createElement('label'),
        wrapper = document.createElement('div'),
        options = ['source-over', 'multiply'];


    labelElement.innerHTML = 'layer compositing';
    wrapper.setAttribute('class','stylewidget-element');
    wrapper.appendChild(labelElement);

    _.each(options, function(option){
        var radio = document.createElement('input'),
            radioWrapper= document.createElement('div');
        radio.setAttribute('type', 'radio');
        radio.setAttribute('name', 'compositing');
        radio.setAttribute('value', option);
        if (layer.get('style.globalCompositeOperation', 'multiply') === option) {
            radio.setAttribute('checked', 1);
        }
        radioWrapper.appendChild(radio);
        radioWrapper.appendChild(document.createTextNode(option));
        wrapper.appendChild(radioWrapper);
        radio.addEventListener('change', function(event){
            layer.set('style.globalCompositeOperation', option);
        }, false);
    });

    return wrapper;
}


function styler (ctx) {
    var container = ctx.container,
        layer = ctx.layer,
        inputs = [];


    var params = [
        ['line color', 'color', 'style.strokeStyle'],
        ['line width (meters)', 'number', 'style.lineWidth'],
        ['hatches number', 'number', 'params.hn'],
        ['hatches step (meters)', 'number', 'params.step'],
        ['hatches angle (degrees)', 'number', 'params.rotation'],
        ['font size (meters)', 'number', 'params.fontsize'],
        ['font color', 'color', 'style.fillStyle'],
        imageStyleClip,
        imageStyleAdjust,
        layerCompositing
    ];

    var genCB = function (prop) {
        return function (val) {
            layer.set(prop, val);
        };
    };

    _.each(params, function(p){
        if (_.isFunction(p)) {
            container.appendChild(p(layer));
        }
        else {
            var label = p[0],
                type = p[1],
                prop = p[2];

            var input = makeInput({
                label: label,
                type: type,
                value: layer.get(prop)
            }, genCB(prop));
            addClass(input, 'stylewidget-element');
            container.appendChild(input);
        }

    });
}

function prepareContainer (layer) {
    var styleWidgetWrapper = document.createElement('div'),
        styleWidgetHeader = document.createElement('div');

    addClass(styleWidgetWrapper, 'stylewidget-wrapper');
    addClass(styleWidgetHeader, 'stylewidget-header');

    styleWidgetHeader.appendChild(
        document.createTextNode(
            'Apply styles to all elements in layer "' + getModelName(layer) + '"'
            )
        );

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
        display = terminal.display();




    var resolver = function (resolve, reject) {

        binder.getLayer(uid, gid, lid)
            .then(function(layer){
                var styleWidgetWrapper = prepareContainer(layer);
                styler({
                    container: styleWidgetWrapper,
                    layer: layer
                });

                var closeButton = document.createElement('div');
                closeButton.setAttribute('class', 'stylewidget-close push-cancel');
                closeButton.innerHTML = 'Close';

                closeButton.addEventListener('click', function(){
                    display.end();
                    resolve(0);
                }, false);

                styleWidgetWrapper.appendChild(closeButton);
                display.node.appendChild(styleWidgetWrapper);
            })
            .catch(reject);
    };

    return (new Promise(resolver));
}


module.exports = exports = {
    name: 'styler',
    command: styleWidget
};
