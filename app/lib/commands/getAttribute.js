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

var _ = require('underscore');

function getAttr () {
    var self = this,
        shell = self.shell,
        stdout = shell.stdout,
        terminal = shell.terminal,
        args = _.toArray(arguments),
        key = args.shift(),
        sys = self.sys,
        result;
    if(key){
        result = self.data.get(key);
        // sys.stdout.write('"'+ key +'" : '+ JSON.stringify(self.data.get(key)));
        sys.stdout.write('<span class="key-value key-'+ key + '">' + '<span class="key">' + key + ' :' + '</span>' + '<span class="value">' + JSON.stringify(result) + '</span>' + '</span>');

    }
    else{
        var data = self.data.getData();
        result = data;

        for(var k in data){
            sys.stdout.write('<span class="key-value key-'+ k + '">' + '<span class="key">' + k + ' :' + '</span>' + '<span class="value">' + JSON.stringify(data[k]) + '</span>' + '</span>');
            // stdout.write(terminal.makeCommand({
            //     'args': [
            //         'get '+ key +' | edit | set ' + key
            //     ],
            //     'text': 'edit'
            // }));
        }

        stdout.write('<span class="hint">Help : <a href="http://alpha.waend.com/documentation/help.html#set" target="_blank">Set Attributes</a></span>');
    }


    return self.end(result);

}


module.exports = exports = {
    name: 'get',
    command: getAttr
};
