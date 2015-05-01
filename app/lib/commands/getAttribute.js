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
        args = _.toArray(arguments),
        key = args.shift(),
        sys = self.sys,
        result = undefined;
    if(key){
        result = self.data.get(key)
        // sys.stdout.write('"'+ key +'" : '+ JSON.stringify(self.data.get(key)));
        sys.stdout.write('<span class="key-value key-'+ key + '">' + '<span class="key">' + key + ' :' + '</span>' + '<span class="value">' + JSON.stringify(self.data.get(key)) + '</span>' + '</span>');

    }
    else{
        var data = self.data.getData();
        result = data;
        for(var key in data){
            // sys.stdout.write('<span class="key-value key-'+ key +'">' + '<span class="key">' + '"'+ key +'" : ' +'</span>' + '<span class="value">' + JSON.stringify(data[key]) + '</span>' + '</span>');
            sys.stdout.write('<span class="key-value key-'+ key + '">' + '<span class="key">' + key + ' :' + '</span>' + '<span class="value">' + JSON.stringify(data[key]) + '</span>' + '</span>');
        }
    }

    stdout.write('<span class="hint first-hint-line">HINT : </span>');
    stdout.write('<span class="hint">Add and edit attribute of this element with SET command, by typing :</span>');
    stdout.write('<span class="hint hint-exemple">set attribute-name attribute-value</span>');
    stdout.write('<span class="hint">NOTE : Multiple words attributes must be surrounded by " and "</span>');

    return self.end(result);

};


module.exports = exports = {
    name: 'get',
    command: getAttr
};