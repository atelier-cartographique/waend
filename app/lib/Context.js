/*
 * app/lib/Context.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */


import _ from 'underscore';

import ospath from 'path';
import EventEmitter from 'events';
import {get as getBinder} from './Bind';
import debug from 'debug';
const logger = debug('waend:Context');


class Context extends EventEmitter {

    constructor(options) {
        super();
        this.shell = options.shell;
        this.data = options.data;
        this.parent = options.parent;
        this._current = this._computeCurrent();
        this.binder = getBinder();
    }

    get commands () {
        return {};
    }

    _computeCurrent (ctx, memo) {
        //logger('context.current', ctx, memo);
        if(!ctx){
            ctx = this;
            memo = [];
        }
        if(ctx.parent){
            this._computeCurrent(ctx.parent, memo);
        }
        if(ctx.data){
            memo.push(ctx.data.id);
        }
        return memo;
    }

    /**
     *  this function executes a command in the scope of this context
     */
    exec () {
        const args =  _.toArray(arguments);
        const sys = args.shift();
        const cmd = args.shift();

        if(!(cmd in this.commands)){
            if (this.parent) {
                return this.parent.exec(...arguments);
            }
            throw (new Error(`command not found: ${cmd}`));
        }

        this.sys = sys;

        const ret = this.commands[cmd].apply(this, args);
        return ret;
    }

    current () {
        return this._current;
    }

    getUser () {
        const cur = this.current();
        if (cur.length > 0) {
            return cur[0];
        }
        return null;
    }

    getGroup () {
        const cur = this.current();
        if (cur.length > 1) {
            return cur[1];
        }
        return null;
    }

    getLayer () {
        const cur = this.current();
        if (cur.length > 2) {
            return cur[2];
        }
        return null;
    }

    getFeature () {
        const cur = this.current();
        if (cur.length > 3) {
            return cur[3];
        }
        return null;
    }


    end (ret) {
        if (_.isFunction(ret)) { // we assume fn(resolve, reject)
            return (new Promise(ret));
        }
        return Promise.resolve(ret);
    }

    endWithError (err) {
        return Promise.reject(err);
    }

}


export default Context;
