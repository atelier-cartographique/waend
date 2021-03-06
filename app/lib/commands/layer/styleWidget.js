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

    inputElement.checked = layer.get('params.clip', true);

    addClass(wrapper, 'stylewidget-element');

    wrapper.appendChild(labelElement);
    wrapper.appendChild(inputElement);
    return wrapper;
}

function imageStyleAdjust (layer) {
    var labelElement = document.createElement('label'),
        wrapper = document.createElement('div'),
        options = [
            ['none', 'adjust to shape'],
            ['fit', 'fit in shape'],
            ['cover', 'cover shape']
        ];

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
        if (layer.get('params.adjust', 'none') === optionValue) {
            radio.setAttribute('checked', 1);
        }
        radioWrapper.appendChild(radio);
        radioWrapper.appendChild(document.createTextNode(optionLabel));
        wrapper.appendChild(radioWrapper);
        radio.addEventListener('change', function(event){
            layer.set('params.adjust', optionValue);
        }, false);
    });

    return wrapper;
}


function layerCompositing (layer) {
    var labelElement = document.createElement('label'),
        wrapper = document.createElement('div'),
        options = ['source-over', 'multiply'];


    labelElement.innerHTML = 'layer compositing';
    addClass(wrapper, 'stylewidget-element');
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
        ['text size (meters)', 'number', 'params.fontsize'],
        ['text color', 'color', 'style.fillStyle'],
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
        styleWidgetHeader = document.createElement('div'),
        styleWidgetHeaderLayer = document.createElement('div'),
        styleWidgetHeaderLayerLabel = document.createElement('label');


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
    var self = this,
        env = self.shell.env,
        binder = self.binder,
        stdout = self.sys.stdout,
        stdin = self.sys.stdin,
        terminal = self.shell.terminal,
        current = self.current(),
        uid = current[0],
        gid = current[1],
        lid = current[2];
        // display = terminal.display();




    var resolver = function (resolve, reject) {

        binder.getLayer(uid, gid, lid)
            .then(function(layer){
                var styleWidgetWrapper = prepareContainer(layer);
                styler({
                    container: styleWidgetWrapper,
                    layer: layer
                });
                var com = terminal.makeCommand({
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


module.exports = exports = {
    name: 'styler',
    command: styleWidget
};
