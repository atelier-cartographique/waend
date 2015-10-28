/*
 * app/lib/commands/widget.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */

var _ = require('underscore'),
    Promise = require('bluebird');

var widgets = {
    'ValueSelect': require('./widgets/ValueSelect')
};


function displayWidget () {
    var args = _.toArray(arguments),
        name = args.shift(),
        shell = this.shell,
        terminal = shell.terminal,
        display = terminal.display(),
        config = {},
        Widget;

    try{
        Widget = widgets[name];
        for (var i = 0; i < args.length; i += 2) {
            var k = args[i],
                v = JSON.parse(args[i + 1]);
            config[k] = v;
        }
        config.container = display.node;
        var wdgt = new Widget(config);
        wdgt.build();
    }
    catch (err) {
        display.end();
        return (new Promise.reject(err));
    }


}


module.exports = exports = {
    name: 'widget',
    command: displayWidget
}
