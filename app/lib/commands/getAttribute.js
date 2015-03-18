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
    return self.end(result);
};


module.exports = exports = {
    name: 'get',
    command: getAttr
};