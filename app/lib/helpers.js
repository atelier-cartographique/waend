import _ from 'underscore';
import Projection from 'proj4';
import semaphore from './Semaphore';
import {get as getBinder} from './Bind';
import Geometry from './Geometry';

export function getModelName(model) {
    if (model.get('name')) {
        return model.get('name');
    }
    const id = model.id || '00000000';
    return `•${id.substr(0, 6)}`;
}

export function copy(data) {
    return JSON.parse(JSON.stringify(data));
}

export function reducePromise(args, fn, start) {

    const reducer = val => {
        val = Array.isArray(val) ? val : [val]
        const length = val.length;

        if (length === 0) {
            return Promise.resolve(start);
        }

        return val.reduce(function (promise, curr, index, arr) {
            return promise.then(function (prev) {
                if (prev === undefined && length === 1) {
                    return curr;
                }

                return fn(prev, curr, index, arr)
            })
        }, Promise.resolve(start))
    }

    return Promise.resolve(args).then(reducer);
}

// DOM

export function setAttributes(elem, attrs) {
    _.each(attrs, (val, k) => {
        elem.setAttribute(k, val);
    });
    return elem;
}

export function addClass(elem, c) {
    const ecStr = elem.getAttribute('class');
    const ec = ecStr ? ecStr.split(' ') : [];
    ec.push(c);
    elem.setAttribute('class', _.uniq(ec).join(' '));
}

export function toggleClass(elem, c) {
    const ecStr = elem.getAttribute('class');
    const ec = ecStr ? ecStr.split(' ') : [];
    if (_.indexOf(ec, c) < 0) {
        exports.addClass(elem, c);
    }
    else {
        exports.removeClass(elem, c);
    }
}

export function hasClass(elem, c) {
    const ecStr = elem.getAttribute('class');
    const ec = ecStr ? ecStr.split(' ') : [];
    return !(_.indexOf(ec, c) < 0)
}

export function removeClass(elem, c) {
    const ecStr = elem.getAttribute('class');
    const ec = ecStr ? ecStr.split(' ') : [];
    elem.setAttribute('class', _.without(ec, c).join(' '));
}

export function emptyElement(elem) {
    while (elem.firstChild) {
        exports.removeElement(elem.firstChild);
    }
    return elem;
}

export function removeElement(elem, keepChildren) {
    if (!keepChildren) {
        exports.emptyElement(elem);
    }
    const parent = elem.parentNode;
    const evt = document.createEvent('CustomEvent');
    parent.removeChild(elem);
    evt.initCustomEvent('remove', false, false, null);
    elem.dispatchEvent(evt);
    return elem;
}

export function px(val=0) {
    return `${val.toString()}px`;
}

// DOM+

export function makeButton(label, attrs, callback, ctx) {
    const button = document.createElement('div');
    const labelElement = document.createElement('span');
    exports.addClass(labelElement, 'label');
    labelElement.innerHTML = label;

    exports.setAttributes(button, attrs);

    if (callback) {
        button.addEventListener('click', event => {
            callback.call(ctx, event);
        }, false);
    }

    button.appendChild(labelElement);
    return button;
}

export function makeInput(options, callback, ctx) {
    const inputElement = document.createElement('input');
    const labelElement = document.createElement('label');
    const wrapper = document.createElement('div');
    const type = options.type;

    exports.setAttributes(wrapper, options.attrs || {});

    labelElement.innerHTML = options.label;
    inputElement.setAttribute('type', type);
    inputElement.value = options.value;
    if (callback) {
        inputElement.addEventListener('change', event => {
            let val = inputElement.value;
            if ('number' === type) {
                val = Number(val);
            }
            callback.call(ctx, val);
        }, false);
    }

    wrapper.appendChild(labelElement);
    wrapper.appendChild(inputElement);
    return wrapper;
}

export function eventPreventer(elem, events) {
    _.each(events, eventName => {
        elem.addEventListener(eventName, e => {
            // e.preventDefault();
            e.stopPropagation();
        }, false);
    });
}

// events

export function isKeyCode(event, kc) {
    return kc === event.which || kc === event.keyCode;
}

// GEOM

export function vecDist(v1, v2) {
    const dx = v2[0] - v1[0];
    const dy = v2[1] - v1[1];
    return Math.sqrt((dx*dx) + (dy*dy));
}

export function vecAdd(v1, v2, a) {
    const t = a / vecDist(v1, v2);
    const rx = v1[0] + (v2[0] - v1[0]) * t;
    const ry = v1[1] + (v2[1] - v1[1]) * t;
    return [rx, ry];
}

export function vecEquals(v1, v2, eps=0.00000001) {
    return (exports.vecDist(v1, v2) < eps);
}

export function transformExtent(extent, T) {
    const min = extent.slice(0,2);
    const max = extent.slice(2);
    T.mapVec2(min);
    T.mapVec2(max);
    return min.concat(max);
}

// GEO

const Proj3857 = Projection('EPSG:3857');

export function projectExtent(extent, proj=Proj3857) {
    const min = proj.forward(extent.slice(0,2));
    const max = proj.forward(extent.slice(2));
    return min.concat(max);
}

export function unprojectExtent(extent, proj=Proj3857) {
    const min = proj.inverse(extent.slice(0,2));
    const max = proj.inverse(extent.slice(2));
    return min.concat(max);
}


function addExtent (feature, extent) {
    const geom = feature.getGeometry();
    extent.add(geom);
}

export function layerExtent(layer) {
    const path = layer.getPath();
    const binder = getBinder();

    return binder.getFeatures(...path)
        .then(features => {
        let extent;

        for (const feature of features) {
            if (extent) {
                addExtent(feature, extent);
            }
            else {
                extent = new Geometry.Extent(feature.getGeometry());
            }
        }

        return extent;
    })
        .catch(err => {
            console.error('layerExtent', err);
        });
}
