/*
 * app/lib/commands/setAttribute.js
 *     
 * 
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 * 
 * License in LICENSE file at the root of the repository.
 *
 */

var _ = require('underscore');

function setAttr () {
    if(arguments.length === 0){return self.end();}
    var args = _.toArray(arguments);
        key = args.shift(),
        env = this.shell.env;

    if (!key) {
        throw (new Error('No Key'));
    }
    else if (0 === args.length) {
        var delivered = ('toString' in env.DELIVERED) ? env.DELIVERED.toString() : env.DELIVERED;
        var data = JSON.parse(delivered);
        return this.data.set(key, data);
    }
    else if (1 === args.length) {
        // we first try to parse it, who knows?
        try {
            var data = JSON.parse(args[0].toString());
            return this.data.set(key, data);
        }
        catch (err) {
            // ok, didn't work either, make it a String.
            return this.data.set(key, args[0].toString());
        }
    }
    // finally we consider each argument to be an array item of type String
    var data = _.map(args, function(v){
        return v.toString();
    });
    return this.data.set(key, data);
};


module.exports = exports = {
    name: 'set',
    command: setAttr
};