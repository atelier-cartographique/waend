/*
 * app/lib/commands/getAttribute.js
 *     
 * 
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 * 
 * License in LICENSE file at the root of the repository.
 *
 */


function getAttr () {
    var self = this,
        sys = self.sys;
    if(arguments.length === 1){
        sys.stdout.write('"'+ key +'" : '+ JSON.stringify(self.data.get(arguments[0])));
    }
    else{
        var data = self.data.getData();
        for(var key in data){
            sys.stdout.write('"'+ key+'" : '+ JSON.stringify(data[key]));
        }
    }

    return self.end();
};


module.exports = exports = {
    name: 'get',
    command: getAttr
};