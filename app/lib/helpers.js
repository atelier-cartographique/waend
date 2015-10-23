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

// DOM

module.exports.setAttributes = function (elem, attrs) {
    _.each(attrs, function (val, k) {
        elem.setAttribute(k, val);
    });
    return elem;
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


// DOM+

module.exports.makeButton = function (label, attrs, callback, ctx) {
    var button = document.createElement('div'),
        labelElement = document.createElement('span');
    exports.addClass(labelElement, 'label');
    labelElement.innerHTML = label;

    exports.setAttributes(button, attrs);

    if (callback) {
        button.addEventListener('click', function(event){
            callback.call(ctx, event);
        }, false);
    }

    button.appendChild(labelElement);
    return button;
};


// GEOM

module.exports.vecDist = function (v1, v2) {
    var dx = v2[0] - v1[0],
        dy = v2[1] - v1[1];
    return Math.sqrt((dx*dx) + (dy*dy));
};

module.exports.vecAdd = function (v1, v2, a) {
    var t = a / vecDist(v1, v2),
        rx = v1[0] + (v2[0] - v1[0]) * t,
        ry = v1[1] + (v2[1] - v1[1]) * t;
    return [rx, ry];
};

module.exports.vecEquals = function (v1, v2, eps) {
    eps = eps || 0.00000001;
    return (exports.vecDist(v1, v2) < eps);
};
