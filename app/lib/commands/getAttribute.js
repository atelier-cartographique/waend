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
            sys.stdout.write('"'+ key+'" : '+ JSON.stringify(data[key]));
        }
    }

    stdout.write('<div class="hint">You can add or edit any attribute of this element</div>');
    stdout.write('<div class="hint">simply by writing :</div>');
    stdout.write('<div class="hint">set attribute-name attribute-value</div>');
    stdout.write('<div class="hint">Eg : </div>');
    stdout.write('<div class="hint">set name Brussels</div>');
    stdout.write('<div class="hint">will give the name Brussels to your element</div>');
    stdout.write('<div class="hint">Attributes are used to qualify your datas, like : age, height, number, etc.. </div>');

    return self.end(result);

};


module.exports = exports = {
    name: 'get',
    command: getAttr
};