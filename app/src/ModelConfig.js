/*
 * app/src/ModelConfig.js
 *
 *
 * Copyright (C) 2015  Pierre Marchand <pierremarc07@gmail.com>
 *
 * License in LICENSE file at the root of the repository.
 *
 */

var helpers = require('../lib/helpers'),
    slugify = require('underscore.string/slugify');

var getModelName = helpers.getModelName,
    addClass = helpers.addClass,
    emptyElement = helpers.emptyElement,
    setAttributes = helpers.setAttributes;


function getDomFragmentFactory (type) {

    function getValue(model, key) {
        if ('name' === key) {
            return getModelName(model);
        }
        return JSON.stringify(model.getData()[key])
    }

    function getDomFragment(key, tagName, attrs) {
        tagName = tagName || 'div';
        var self = this,
            element = document.createElement(tagName);

        if (attrs) {
            setAttributes(element, attrs);
        }

        addClass(element, type + '-' + slugify(key));

        element.appendChild(
            document.createTextNode(getValue(self, key))
        );

        var updater = function(changedKey, newValue) {
            if (element && (key === changedKey)) {
                emptyElement(element);
                element.appendChild(
                    document.createTextNode(getValue(self, key))
                )
            }
        };

        self.on('set', updater);
        return element;
    }

    return getDomFragment;
}

module.exports.configurator = function (Model) {
    var type = Model.prototype.type;
    Model.prototype.getDomFragment = getDomFragmentFactory(type);
    return Model;
};
