/*
 * app/lib/commands/getAttribute.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */

'use strict';

var _ = require('underscore'),
    helpers = require('../helpers');

var addClass = helpers.addClass,
    emptyElement = helpers.emptyElement;


function getAttr () {
    var self = this,
        shell = self.shell,
        stdout = shell.stdout,
        terminal = shell.terminal,
        args = _.toArray(arguments),
        key = args.shift(),
        sys = self.sys,
        result;

    var makeOutput = function (k, model) {
        var wrapper = document.createElement('div'),
            key = document.createElement('div'),
            value = model.getDomFragment(k);

        addClass(key, 'key-value');

        key.appendChild(
            document.createTextNode(k.toString())
        );

        wrapper.appendChild(key);
        wrapper.appendChild(value);


        return terminal.makeCommand({
            fragment: wrapper,
            text: k.toString()
        });
    };

    var result = key ? self.data.get(key) : self.data.getData(),
        keys = key ? [key] : _.keys(self.data.getData());

    _.each(keys, function(key){
        stdout.write(makeOutput(key, self.data));
    });

    return self.end(result);
}


module.exports = exports = {
    name: 'get',
    command: getAttr
};
