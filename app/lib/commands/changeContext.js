/*
 * app/lib/commands/chnageContext.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */

import _ from 'underscore';

import ospath from 'path';
import Promise from "bluebird";
import {get as getBinder} from "../Bind";

const dotdot = '..';
const dot = '.';

function cc (opt_path) {
    if (!opt_path) {
        const tmp = this.shell.env.DELIVERED;
        if (_.isString(tmp)) {
            opt_path = tmp;
        }
        else if (_.isObject(tmp) && ('id' in tmp)) {
            const bcomps = getBinder().getComps(tmp.id);
            opt_path = `/${bcomps.join('/')}`;
        }
        else {
            return this.endWithError('NothingToChangeTo');
        }
    }

    const path = ospath.normalize(opt_path);
    const isAbsolute = ospath.isAbsolute ? ospath.isAbsolute(path) : '/' === path[0];
    const pathComps = path.split('/');
    let ctxPath = [];
    const shell = this.shell;
    const terminal = this.shell.terminal;
    const stdout = this.sys.stdout;
    const stderr = this.sys.stderr;

    if(isAbsolute){
        if(path.length > 1){
            pathComps.shift();
            ctxPath = pathComps;
        }
    }
    else{
        const pathCompsRef = path.split('/');
        const current = this.current();
        for (var i = 0; i < pathCompsRef.length; i++) {
            const comp = pathCompsRef[i];
            if(dotdot === comp){
                current.pop();
                pathComps.shift();
            }
            else{
                break;
            }
        }
        ctxPath = current.concat(pathComps);
    }

    for (var i = ctxPath.length - 1; i >= 0; i--) {
        const match = getBinder().matchKey(ctxPath[i]);
        if(match.length === 1){
            ctxPath[i] = match[0].id;
        }
        else{
            // if('me' !== ctxPath[i]){
            //     stderr.write('have '+ match.length +' match for '+ ctxPath[i]);
            // }
        }
    }

    const self = this;

    return this.shell.historyPushContext(ctxPath)
        .then(() => self.end(ctxPath))
        .catch(err => Promise.reject(err));
}

export default {
    name: 'cc',
    command: cc
};
