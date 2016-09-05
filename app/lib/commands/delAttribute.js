/*
 * app/lib/commands/delAttribute.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */

import _ from 'underscore';

function delKey (obj, pathStr) {
    const path = pathStr.split('.');
    let key;
    for(let i = 0, len = path.length - 1; i < len; i++){
        key = path.shift();
        obj = obj[key];
    }
    key = path.shift();
    delete obj[key];
}


function delAttr (key) {
    const data = this.data.getData();
    try {
        delKey(data, key);
    }
    catch (err) {
        return this.endWithError(err);
    }
    return this.data.setData(data);
}


export default {
    name: 'del',
    command: delAttr
};
