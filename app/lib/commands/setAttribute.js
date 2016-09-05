/*
 * app/lib/commands/setAttribute.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */

import _ from 'underscore';

function setAttr () {
    if(arguments.length === 0){return self.end();}
    const args = _.toArray(arguments);
    const key = args.shift();
    const env = this.shell.env;
    let data;

    if (!key) {
        throw (new Error('No Key'));
    }

    if (0 === args.length && env.DELIVERED) {
        if (_.isArray(env.DELIVERED)) { // toString on this does not mork
            return this.data.set(key, env.DELIVERED);
        }
        try {
            const delivered = env.DELIVERED.toJSON();
            return this.data.set(key, delivered);
        }
        catch (err) {
//            return this.data.set(key, env.DELIVERED);
             try {
                data = JSON.parse(env.DELIVERED.toString());
                return this.data.set(key, data);
            }
            catch (err) {
                // ok, didn't work either, make it a String.
                return this.data.set(key, env.DELIVERED.toString());
            }
        }
    }
    else if (1 === args.length) {
        // we first try to parse it, who knows?
        try {
            data = JSON.parse(args[0].toString());
            return this.data.set(key, data);
        }
        catch (err) {
            // ok, didn't work either, make it a String.
            return this.data.set(key, args[0].toString());
        }
    }
    // finally we consider each argument to be an array item
    data = _.map(args, v => {
        try {
            const ldata = JSON.parse(v.toString());
            return ldata;
        }
        catch (err) {
            return v.toString();
        }
    });
    return this.data.set(key, data);
}


export default {
    name: 'set',
    command: setAttr
};
