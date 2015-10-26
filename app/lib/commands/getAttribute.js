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

    var makeOutput = function (k, v) {
        var wrapper = document.createElement('div'),
            key = document.createElement('div'),
            value = document.createElement('div');

        addClass(key, 'key-value');
        addClass(value, 'value');

        key.appendChild(
            document.createTextNode(k.toString())
        );
        value.appendChild(
            document.createTextNode(JSON.stringify(v))
        );

        wrapper.appendChild(key);
        wrapper.appendChild(value);

        self.data.on('set', function(changedKey, newValue) {
            if (value) {
                emptyElement(value);
                value.appendChild(
                    document.createTextNode(JSON.stringify(newValue))
                )
            }
        });

        return terminal.makeCommand({
            fragment: wrapper,
            text: k.toString()
        });
    }

    if(key){
        result = self.data.get(key);
        stdout.write(makeOutput(key, result));
    }
    else{
        var data = self.data.getData();
        result = data;

        for(var k in data){
            stdout.write(makeOutput(k, data[k]));
        }
    }


    return self.end(result);

}


module.exports = exports = {
    name: 'get',
    command: getAttr
};
