/*
 * app/lib/commands/delAttribute.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */

var _ = require('underscore');

function delAttr (key) {
    var data = this.data.getData();
    if (key in data) {
        delete data[key];
    }
    return this.data.setData(data);
}


module.exports = exports = {
    name: 'del',
    command: delAttr
};
