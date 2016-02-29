/*
 * app/lib/commands/textEdit.js
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

function styler (ctx) {
    var container = ctx.container,
        layer = ctx.layer,
        inputs = [];


    var params = [
        ['stroke color', 'color', 'style.strokeStyle'],
        ['line width', 'number', 'style.lineWidth'],
        ['hatches number', 'number', 'params.hn'],
        ['hatches step', 'number', 'params.step'],
        ['hatches rotation', 'number', 'params.rotation'],
    ];

    var genCB = function (prop) {
        return function (val) {
            layer.set(prop, val);
        };
    };

    _.each(params, function(p){
        var label = p[0],
            type = p[1],
            prop = p[2];

        var input = makeInput({
            label: label,
            type: type,
            value: layer.get(prop)
        }, genCB(prop));
        container.appendChild(input);
    });
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

    var styleWidgetWrapper = document.createElement('div');
    styleWidgetWrapper.setAttribute('class', 'stylewidget-wrapper');
    display.node.appendChild(styleWidgetWrapper);


    var resolver = function (resolve, reject) {

        binder.getLayer(uid, gid, lid)
            .then(function(layer){
                styler({
                    container: styleWidgetWrapper,
                    layer: layer
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
    };

    return (new Promise(resolver));
}


module.exports = exports = {
    name: 'styler',
    command: styleWidget
};
