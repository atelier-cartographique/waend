/*
 * app/lib/helpers.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */

var _ = require('underscore');

module.exports.getModelName = function (model) {
    if (model.get('name')) {
        return model.get('name');
    }
    var id = model.id || '00000000';
    return '•' + id.substr(0, 6);
};

module.exports.addClass = function (elem, c) {
    var ecStr = elem.getAttribute('class');
    var ec = ecStr ? ecStr.split(' ') : [];
    ec.push(c);
    elem.setAttribute('class', _.uniq(ec).join(' '));
}

module.exports.removeClass = function (elem, c) {
    var ecStr = elem.getAttribute('class');
    var ec = ecStr ? ecStr.split(' ') : [];
    elem.setAttribute('class', _.without(ec, c).join(' '));
}
