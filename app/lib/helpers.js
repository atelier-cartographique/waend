/*
 * app/lib/helpers.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */

var _ = require('underscore'),
    Projection = require('proj4');

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

module.exports.toggleClass = function (elem, c) {
    var ecStr = elem.getAttribute('class');
    var ec = ecStr ? ecStr.split(' ') : [];
    if (_.indexOf(ec, c) < 0) {
        exports.addClass(elem, c);
    }
    else {
        exports.removeClass(elem, c);
    }
}

module.exports.hasClass = function (elem, c) {
    var ecStr = elem.getAttribute('class');
    var ec = ecStr ? ecStr.split(' ') : [];
    return !(_.indexOf(ec, c) < 0)
}

module.exports.removeClass = function (elem, c) {
    var ecStr = elem.getAttribute('class');
    var ec = ecStr ? ecStr.split(' ') : [];
    elem.setAttribute('class', _.without(ec, c).join(' '));
}

module.exports.emptyElement = function (elem) {
    while (elem.firstChild) {
        elem.removeChild(elem.firstChild);
    }
    return elem;
};

module.exports.px = function (val) {
    val = val || 0;
    return val.toString() + 'px';
};

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

module.exports.eventPreventer = function (elem, events) {
    _.each(events, function (eventName) {
        elem.addEventListener(eventName, function(e){
            // e.preventDefault();
            e.stopPropagation();
        }, false);
    });
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

module.exports.transformExtent = function (extent, T) {
    var min = extent.slice(0,2),
        max = extent.slice(2);
    T.mapVec2(min);
    T.mapVec2(max);
    return min.concat(max);
};

// GEO

var Proj3857 = Projection('EPSG:3857');

module.exports.projectExtent = function (extent, proj) {
    proj = proj || Proj3857;
    var min = proj.forward(extent.slice(0,2)),
        max = proj.forward(extent.slice(2));
    return min.concat(max);
};

module.exports.unprojectExtent = function (extent, proj) {
    proj = proj || Proj3857;
    var min = proj.inverse(extent.slice(0,2)),
        max = proj.inverse(extent.slice(2));
    return min.concat(max);
};
