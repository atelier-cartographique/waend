/*
 * app/lib/Stream.js
 *     
 * 
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 * 
 * License in LICENSE file at the root of the repository.
 *
 */


import {Object as O} from '../../lib/object';

import Promise from "bluebird";
import _ from 'underscore';

const Stream = O.extend({
    
    initialize(noAutoOpen) {
        this._entries = [];
        this._open = !(!!noAutoOpen);
    },

    open() {
        this._open = true;
    },

    close() {
        this._open = false;
    },

    isOpened() {
        return !!this._open;
    },

    write() {
        if(this.isOpened()){
            const data = _.toArray(arguments);
            this._entries.push(data);
            const args = ['data'].concat(data);
            this.emit(...args);
        }
    },

    read() {
        if(this.isOpened){
            const entry = this._entries.shift();
            if (entry) {
                return Promise.resolve(entry);
            }
            else {
                const self = this;
                const resolver = (resolve, reject) => {
                    self.once('data', () => {
                        const entry = self._entries.shift();
                        resolve.apply(self, entry);
                    });
                };
                return (new Promise(resolver));
            }
        }
        // return Promise.reject('stream is closed');
    },

    readSync() {
        if(this.isOpened()){
            return this._entries.shift();
        }
    },

    dump() {
        const entries = this._entries;
        this._entries = [];
        return entries;
    }
});

export default Stream;
