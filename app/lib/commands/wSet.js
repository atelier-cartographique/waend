/*
 * app/lib/commands/wSet.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */

var _ = require('underscore'),
    Promise = require('bluebird'),
    helpers = require('../helpers');

var addClass = helpers.addClass,
    removeClass = helpers.removeClass,
    emptyElement = helpers.emptyElement,
    removeElement = helpers.removeElement,
    hasClass = helpers.hasClass,
    toggleClass = helpers.toggleClass,
    px = helpers.px,
    makeButton = helpers.makeButton;


var widgets = {
    'ValueSelect': require('./widgets/ValueSelect')
};

function makeWidgetForm (widget, ok, cancel) {
    var form = document.createElement('div'),
        buttonWrapper = document.createElement('div'),
        widgetWrapper = document.createElement('div'),
        buttonOk = makeButton('Ok', {}, ok),
        buttonCancel = makeButton('Cancel', {}, cancel);

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
    var self = this,
        args = _.toArray(arguments),
        name = args.shift(),
        key = args.shift(),
        data = this.data;
        oldValue = data.get(key);
        shell = this.shell,
        terminal = shell.terminal;

    var resolver = function (resolve, reject) {
        var display = terminal.display();
        try{
            var Widget = widgets[name],
                config = {};
            for (var i = 0; i < args.length; i += 2) {
                var k = args[i],
                    v = JSON.parse(args[i + 1]);
                config[k] = v;
            }

            var widget = new Widget(config)
                retVal = oldValue;

            var ok = function () {
                display.end();
                resolve(data.get(key));
            };

            var cancel = function () {
                display.end();
                data.set(key, oldValue);
                resolve(data.get(key));
            };

            widget.on('value', function(v) {
                data.set(key, v);
            });

            var form = makeWidgetForm(widget, ok, cancel);
            display.node.appendChild(form);
        }
        catch (err) {
            display.end();
            reject(err);
        }
    };

    return (new Promise(resolver));
}


module.exports = exports = {
    name: 'wset',
    command: wSet
}
