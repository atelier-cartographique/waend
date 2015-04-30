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
        sys.stdout.write('"'+ key +'" : '+ JSON.stringify(self.data.get(key)));
    }
    else{
        var data = self.data.getData();
        result = data;
        for(var key in data){
            sys.stdout.write('<span class="key-value key-'+ key +'">' + '<span class="key">' + '"'+ key +'" : ' +'</span>' + '<span class="value">' + JSON.stringify(data[key]) + '</span>' + '</span>');
        }
    }

    stdout.write('<span class="hint first-hint-line">You can add or edit any attribute of this element</span>');
    stdout.write('<span class="hint">simply by writing :</span>');
    stdout.write('<span class="hint hint-exemple">set attribute-name attribute-value</span>');
    stdout.write('<span class="hint">Eg : </span>');
    stdout.write('<span class="hint hint-exemple">set name Brussels</span>');
    stdout.write('<span class="hint">will give the name Brussels to your element</span>');
    stdout.write('<span class="hint">Attributes are used to qualify your datas, like : age, height, description, etc.. </span>');

    return self.end(result);

};


module.exports = exports = {
    name: 'get',
    command: getAttr
};